/**
 * れんしゅう画面。「みてね (お手本アニメ)」→「なぞってね (ガイド付き)」→「じぶんで (シルエットのみ)」
 * の3フェーズを表示・入力処理する。フェーズ進行のロジックそのものは practiceState.ts に委譲し、
 * ここは DOM 構築・入力ハンドリング・アニメーション呼び出しに徹する。
 */

import type { CharStrokeData } from '../data/types.ts';
import { matchStroke, type FailReason, type Point } from '../lib/matcher.ts';
import { playOops, playPop, playSuccess } from '../lib/audio.ts';
import { PracticeState, type Phase, type PracticeResult, type PracticeStateSnapshot } from '../lib/practiceState.ts';
import {
  createCompletedPath,
  createDemoPath,
  createDirectionArrow,
  createGuidePath,
  createSilhouettePath,
  createStartDot,
  createTrailPath,
  ensureArrowMarkerDefs,
  fadeOutTrail,
  flashElement,
  renderProgressDots,
  animateStrokeDraw,
  shakeElement,
  snapToReference,
  updateTrailPath,
} from '../lib/strokeRenderer.ts';

export interface PracticeScreenProps {
  /** 練習対象の文字 (strokes.json のキー) */
  char: string;
  /** 上部に小さく表示する読み。省略時は char をそのまま使う */
  reading?: string;
  /** 対象文字の書き順データ */
  strokeData: CharStrokeData;
  /** 完了時 (じぶんでフェーズの最後の画に正解したとき) に呼ばれる */
  onComplete: (result: PracticeResult) => void;
}

declare global {
  interface Window {
    __kakijun?: {
      simulateStroke: (points: { x: number; y: number }[]) => Promise<void>;
      getPhase: () => Phase;
    };
  }
}

const SUCCESS_MESSAGES = ['すごい!', 'じょうず!', 'そのちょうし!', 'やったね!', 'ぴったり!'];

const REASON_MESSAGES: Record<FailReason, string> = {
  'wrong-order': 'じゅんばんが ちがうよ!',
  'wrong-direction': 'むきが はんたい!',
  'wrong-start': 'スタートは ここだよ!',
  'wrong-shape': 'おしい! もういちど!',
};

const PHASE_START_MESSAGES: Record<Phase, string> = {
  watch: 'よく みてね',
  trace: 'なぞって みよう',
  solo: 'じぶんで かいてみよう!',
  complete: 'かんせい!',
};

const PHASE_INFO: Record<Phase, { icon: string; label: string }> = {
  watch: { icon: '\u{1F440}', label: 'みてね' },
  trace: { icon: '✏️', label: 'なぞってね' },
  solo: { icon: '\u{1F4AA}', label: 'じぶんで' },
  complete: { icon: '\u{1F389}', label: 'かんせい' },
};

const HINT_MESSAGE = 'もういちど おてほんを みてね';

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

/**
 * れんしゅう画面を container にマウントする。
 * 戻り値のクリーンアップ関数を呼ぶと、進行中のアニメーションを止めて DOM を空にする。
 */
export function mountPracticeScreen(container: HTMLElement, props: PracticeScreenProps): () => void {
  const strokes = props.strokeData.strokes;
  const medianPoints: Point[][] = props.strokeData.medians.map((stroke) =>
    stroke.map(([x, y]) => ({ x, y }))
  );
  const strokeCount = strokes.length;

  const state = new PracticeState(strokeCount);
  let watchAbort: AbortController | null = null;
  let busy = false;
  let capturing = false;
  /** キャプチャ中の pointerId。マルチタッチで別の指が触れても無視するために使う */
  let activePointerId: number | null = null;
  let currentPoints: Point[] = [];
  let trailEl: SVGPathElement | null = null;
  let destroyed = false;

  container.innerHTML = '';
  container.classList.add('practice-screen');

  const header = document.createElement('div');
  header.className = 'practice-header';
  const readingEl = document.createElement('div');
  readingEl.className = 'practice-reading';
  readingEl.textContent = props.reading ?? props.char;
  const phaseEl = document.createElement('div');
  phaseEl.className = 'practice-phase';
  const phaseIconEl = document.createElement('span');
  phaseIconEl.className = 'phase-icon';
  const phaseLabelEl = document.createElement('span');
  phaseLabelEl.className = 'phase-label';
  phaseEl.append(phaseIconEl, phaseLabelEl);
  header.append(readingEl, phaseEl);

  const progressDotsEl = document.createElement('div');
  progressDotsEl.className = 'progress-dots';

  const stageWrap = document.createElement('div');
  stageWrap.className = 'practice-stage-wrap';

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  svgEl.setAttribute('viewBox', '0 0 109 109');
  svgEl.setAttribute('class', 'practice-svg');
  // touch-action: none は style.css の .practice-svg で設定する (二重設定を避ける)
  ensureArrowMarkerDefs(svgEl);
  stageWrap.appendChild(svgEl);

  const messageEl = document.createElement('div');
  messageEl.className = 'practice-message';

  container.append(header, progressDotsEl, stageWrap, messageEl);

  function setMessage(text: string): void {
    messageEl.textContent = text;
  }

  function updateHeader(snap: PracticeStateSnapshot): void {
    const info = PHASE_INFO[snap.phase];
    phaseIconEl.textContent = info.icon;
    phaseLabelEl.textContent = info.label;
    renderProgressDots(progressDotsEl, strokeCount, snap.strokeIndex, snap.phase);
    container.setAttribute('data-phase', snap.phase);
  }

  function clearStage(): void {
    Array.from(svgEl.children).forEach((child) => {
      if (child.tagName.toLowerCase() !== 'defs') svgEl.removeChild(child);
    });
  }

  /** 現在の state をもとに書字エリアを再描画する (watch フェーズ中は呼ばない) */
  function renderStage(): void {
    clearStage();
    const snap = state.getSnapshot();

    if (snap.phase === 'watch') {
      strokes.forEach((d) => svgEl.appendChild(createSilhouettePath(d)));
      return;
    }

    strokes.forEach((d, i) => {
      if (snap.phase === 'complete' || i < snap.strokeIndex) {
        svgEl.appendChild(createCompletedPath(d));
        return;
      }
      if (i === snap.strokeIndex && snap.phase === 'trace') {
        svgEl.appendChild(createSilhouettePath(d));
        svgEl.appendChild(createGuidePath(d));
        const start = medianPoints[i][0];
        const second = medianPoints[i][5] ?? medianPoints[i][medianPoints[i].length - 1];
        svgEl.appendChild(createStartDot(start, i + 1));
        svgEl.appendChild(createDirectionArrow(start, second));
        return;
      }
      svgEl.appendChild(createSilhouettePath(d));
    });
  }

  async function runCorrectionOverlay(strokeIndex: number, reason: FailReason): Promise<void> {
    const start = medianPoints[strokeIndex][0];
    if (reason === 'wrong-order') {
      const dotGroup = createStartDot(start, strokeIndex + 1);
      svgEl.appendChild(dotGroup);
      await flashElement(dotGroup, 3, 220);
      dotGroup.remove();
    } else if (reason === 'wrong-direction') {
      const stroke = medianPoints[strokeIndex];
      const second = stroke[5] ?? stroke[stroke.length - 1];
      const arrow = createDirectionArrow(start, second);
      svgEl.appendChild(arrow);
      await flashElement(arrow, 3, 220);
      arrow.remove();
    } else if (reason === 'wrong-start') {
      const dotGroup = createStartDot(start, strokeIndex + 1);
      dotGroup.classList.add('emphasize');
      svgEl.appendChild(dotGroup);
      await delay(600);
      dotGroup.remove();
    }
    // wrong-shape はメッセージのみで追加演出なし
  }

  async function runHintDemo(strokeIndex: number): Promise<void> {
    const demoPath = createDemoPath(strokes[strokeIndex]);
    svgEl.appendChild(demoPath);
    await animateStrokeDraw(svgEl, demoPath, { durationMs: 700, dotPoints: medianPoints[strokeIndex] });
    demoPath.remove();
  }

  async function handleStrokeInput(points: Point[], existingTrail?: SVGPathElement): Promise<void> {
    if (busy || destroyed) return;
    const snap = state.getSnapshot();
    if (snap.phase !== 'trace' && snap.phase !== 'solo') return;
    busy = true;

    try {
      const strokeIndex = snap.strokeIndex;
      const previousPhase = snap.phase;
      const trail =
        existingTrail ??
        (() => {
          const t = createTrailPath();
          updateTrailPath(t, points);
          svgEl.appendChild(t);
          return t;
        })();

      const result = matchStroke(points, medianPoints, strokeIndex);
      const referenceD = strokes[strokeIndex];

      if (result.ok) {
        playPop();
        await snapToReference(trail, referenceD);
        trail.remove();
        const outcome = state.recordStrokeResult(true);
        renderStage();
        updateHeader(outcome.snapshot);
        if (outcome.snapshot.phase === 'complete') {
          // 完走したときだけファンファーレ (毎画では playPop() のみ鳴らす)
          playSuccess();
          setMessage(PHASE_START_MESSAGES.complete);
          props.onComplete(state.getResult());
        } else if (outcome.snapshot.phase !== previousPhase) {
          // trace → solo へ切り替わった直後: ガイドが消えることの説明メッセージ
          setMessage(PHASE_START_MESSAGES[outcome.snapshot.phase]);
        } else {
          setMessage(pickRandom(SUCCESS_MESSAGES));
        }
      } else {
        playOops();
        await Promise.all([fadeOutTrail(trail), shakeElement(stageWrap)]);
        const reason: FailReason = result.reason ?? 'wrong-shape';
        setMessage(REASON_MESSAGES[reason]);
        await runCorrectionOverlay(strokeIndex, reason);
        const outcome = state.recordStrokeResult(false);
        if (outcome.hintTriggered) {
          setMessage(HINT_MESSAGE);
          await runHintDemo(strokeIndex);
        }
        renderStage();
        updateHeader(outcome.snapshot);
      }
    } finally {
      busy = false;
    }
  }

  function finishWatchAndEnterTrace(): void {
    state.finishWatching();
    renderStage();
    const snap = state.getSnapshot();
    updateHeader(snap);
    setMessage(PHASE_START_MESSAGES.trace);
  }

  async function runWatchPhase(): Promise<void> {
    const controller = new AbortController();
    watchAbort = controller;
    renderStage();
    updateHeader(state.getSnapshot());
    setMessage(PHASE_START_MESSAGES.watch);

    for (let i = 0; i < strokeCount; i++) {
      if (controller.signal.aborted) break;
      const demoPath = createDemoPath(strokes[i]);
      svgEl.appendChild(demoPath);
      // eslint-disable-next-line no-await-in-loop
      await animateStrokeDraw(
        svgEl,
        demoPath,
        { durationMs: 600, dotPoints: medianPoints[i] },
        controller.signal
      );
      if (controller.signal.aborted) break;
      demoPath.remove();
      svgEl.appendChild(createCompletedPath(strokes[i]));
      // eslint-disable-next-line no-await-in-loop
      await delay(150, controller.signal);
    }

    if (!controller.signal.aborted) {
      finishWatchAndEnterTrace();
    }
  }

  function toSvgPoint(evt: PointerEvent): Point {
    const pt = svgEl.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function onPointerDown(evt: PointerEvent): void {
    if (busy) return;
    // キャプチャ中に別の指 (別 pointerId) が触れても無視する (タブレットで手を添える6歳児対策)
    if (capturing && evt.pointerId !== activePointerId) return;
    const snap = state.getSnapshot();
    if (snap.phase === 'watch') {
      watchAbort?.abort();
      finishWatchAndEnterTrace();
      return;
    }
    if (snap.phase !== 'trace' && snap.phase !== 'solo') return;
    capturing = true;
    activePointerId = evt.pointerId;
    svgEl.setPointerCapture(evt.pointerId);
    currentPoints = [toSvgPoint(evt)];
    trailEl = createTrailPath();
    svgEl.appendChild(trailEl);
    updateTrailPath(trailEl, currentPoints);
    evt.preventDefault();
  }

  function onPointerMove(evt: PointerEvent): void {
    if (!capturing || !trailEl || evt.pointerId !== activePointerId) return;
    currentPoints.push(toSvgPoint(evt));
    updateTrailPath(trailEl, currentPoints);
  }

  function onPointerUp(evt: PointerEvent): void {
    if (!capturing || evt.pointerId !== activePointerId) return;
    capturing = false;
    activePointerId = null;
    const pts = currentPoints;
    const trail = trailEl ?? undefined;
    currentPoints = [];
    trailEl = null;
    if (svgEl.hasPointerCapture(evt.pointerId)) {
      svgEl.releasePointerCapture(evt.pointerId);
    }
    void handleStrokeInput(pts, trail);
  }

  svgEl.addEventListener('pointerdown', onPointerDown);
  svgEl.addEventListener('pointermove', onPointerMove);
  svgEl.addEventListener('pointerup', onPointerUp);
  svgEl.addEventListener('pointercancel', onPointerUp);

  window.__kakijun = {
    simulateStroke: async (points) => {
      if (destroyed) return;
      if (state.getSnapshot().phase === 'watch') {
        watchAbort?.abort();
        finishWatchAndEnterTrace();
      }
      await handleStrokeInput(points);
    },
    getPhase: () => state.getSnapshot().phase,
  };

  void runWatchPhase();

  return function unmount(): void {
    destroyed = true;
    watchAbort?.abort();
    svgEl.removeEventListener('pointerdown', onPointerDown);
    svgEl.removeEventListener('pointermove', onPointerMove);
    svgEl.removeEventListener('pointerup', onPointerUp);
    svgEl.removeEventListener('pointercancel', onPointerUp);
    if (window.__kakijun) delete window.__kakijun;
    container.innerHTML = '';
    container.classList.remove('practice-screen');
    container.removeAttribute('data-phase');
  };
}
