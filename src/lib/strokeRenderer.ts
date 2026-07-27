/**
 * れんしゅう画面の SVG 生成・アニメーションヘルパー。
 * DOM/SVG API に直接依存する (practiceState.ts とは異なりテスト対象外)。
 * viewBox は strokes.json と同じ 0 0 109 109 を前提にする。
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface PointXY {
  x: number;
  y: number;
}

/** 文字を太らせて描く共通の線幅 (T004 要件) */
export const STROKE_WIDTH = 6.5;

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

function applyStrokeStyle(path: SVGPathElement): void {
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-width', String(STROKE_WIDTH));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
}

/** 全画共通の淡いシルエットガイド (じぶんでフェーズ・全フェーズの背面に常時表示) */
export function createSilhouettePath(d: string): SVGPathElement {
  const path = el('path');
  path.setAttribute('d', d);
  applyStrokeStyle(path);
  path.setAttribute('class', 'stroke-silhouette');
  return path;
}

/** いま書く画のガイド (なぞってねフェーズ: 点線ハイライト) */
export function createGuidePath(d: string): SVGPathElement {
  const path = el('path');
  path.setAttribute('d', d);
  applyStrokeStyle(path);
  path.setAttribute('class', 'stroke-guide-current');
  return path;
}

/** 確定済みの画 (アクセント色) */
export function createCompletedPath(d: string): SVGPathElement {
  const path = el('path');
  path.setAttribute('d', d);
  applyStrokeStyle(path);
  path.setAttribute('class', 'stroke-completed');
  return path;
}

/** お手本アニメ用の描画パス (みてね・ヒント再生で使う) */
export function createDemoPath(d: string): SVGPathElement {
  const path = el('path');
  path.setAttribute('d', d);
  applyStrokeStyle(path);
  path.setAttribute('class', 'stroke-demo');
  return path;
}

/** ユーザーが指を動かしている間の軌跡パス */
export function createTrailPath(): SVGPathElement {
  const path = el('path');
  applyStrokeStyle(path);
  path.setAttribute('class', 'stroke-trail');
  path.setAttribute('d', '');
  return path;
}

/** 点列を単純な折れ線の path d 属性へ変換する */
export function pointsToPathD(points: PointXY[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const segments = rest.map((p) => `L ${p.x} ${p.y}`);
  return `M ${first.x} ${first.y} ${segments.join(' ')}`.trim();
}

/** ユーザーの軌跡パスを、現在までの点列で更新する */
export function updateTrailPath(path: SVGPathElement, points: PointXY[]): void {
  path.setAttribute('d', pointsToPathD(points));
}

/** 始点・ヒント表示などに使う丸ドット */
export function createDot(cx: number, cy: number, className: string, radius = 4): SVGCircleElement {
  const dot = el('circle');
  dot.setAttribute('cx', String(cx));
  dot.setAttribute('cy', String(cy));
  dot.setAttribute('r', String(radius));
  dot.setAttribute('class', className);
  return dot;
}

/** 画番号入りの始点ドット (なぞってねフェーズ) */
export function createStartDot(point: PointXY, strokeNumber: number): SVGGElement {
  const group = el('g');
  group.setAttribute('class', 'start-dot pulse');
  const circle = createDot(point.x, point.y, 'start-dot-circle', 6);
  const text = el('text');
  text.setAttribute('x', String(point.x));
  text.setAttribute('y', String(point.y));
  text.setAttribute('class', 'start-dot-label');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.textContent = String(strokeNumber);
  group.append(circle, text);
  return group;
}

/** 始点付近に進行方向を示す小さな矢印を描く */
export function createDirectionArrow(from: PointXY, to: PointXY): SVGLineElement {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const arrowLen = 10;
  const end = { x: from.x + ux * arrowLen, y: from.y + uy * arrowLen };

  const line = el('line');
  line.setAttribute('x1', String(from.x));
  line.setAttribute('y1', String(from.y));
  line.setAttribute('x2', String(end.x));
  line.setAttribute('y2', String(end.y));
  line.setAttribute('class', 'direction-arrow');
  line.setAttribute('marker-end', 'url(#arrowhead)');
  return line;
}

/** SVG に矢印マーカー定義を1度だけ追加する (createDirectionArrow が参照する) */
export function ensureArrowMarkerDefs(svg: SVGSVGElement): void {
  if (svg.querySelector('#arrowhead')) return;
  const defs = el('defs');
  const marker = el('marker');
  marker.setAttribute('id', 'arrowhead');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '8');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '5');
  marker.setAttribute('markerHeight', '5');
  marker.setAttribute('orient', 'auto-start-reverse');
  const path = el('path');
  path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  path.setAttribute('class', 'direction-arrow-head');
  marker.append(path);
  defs.append(marker);
  svg.prepend(defs);
}

/** 弧長ベースで点列を n 点にリサンプリングする (お手本ドット移動用の簡易実装) */
function resampleForAnimation(points: PointXY[], n: number): PointXY[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0] }));

  const dists: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    dists.push(dists[i - 1] + Math.hypot(dx, dy));
  }
  const total = dists[dists.length - 1];
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0] }));

  const result: PointXY[] = [];
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1);
    let seg = 1;
    while (seg < dists.length - 1 && dists[seg] < target) seg++;
    const segStart = dists[seg - 1];
    const segEnd = dists[seg];
    const t = segEnd - segStart === 0 ? 0 : (target - segStart) / (segEnd - segStart);
    const a = points[seg - 1];
    const b = points[seg];
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}

export interface DrawAnimationOptions {
  /** アニメーション全体の長さ (ms)。0.5-0.7秒目安 */
  durationMs?: number;
  /** 先端の丸ドットの参照点列 (median)。省略時はドットを出さない */
  dotPoints?: PointXY[];
}

/**
 * stroke-dashoffset で1画を描画するアニメーション。先端に丸いドットを追従させる。
 * `path` は SVG に追加済みであること。完了 (または signal による中断) で resolve する。
 */
export function animateStrokeDraw(
  svg: SVGSVGElement,
  path: SVGPathElement,
  opts: DrawAnimationOptions = {},
  signal?: AbortSignal
): Promise<void> {
  const durationMs = opts.durationMs ?? 600;
  const length = path.getTotalLength();
  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);

  let dot: SVGCircleElement | null = null;
  let dotFrames: PointXY[] = [];
  if (opts.dotPoints && opts.dotPoints.length > 1) {
    dotFrames = resampleForAnimation(opts.dotPoints, 60);
    dot = createDot(dotFrames[0].x, dotFrames[0].y, 'demo-dot', 3.5);
    svg.appendChild(dot);
  }

  return new Promise<void>((resolve) => {
    // setTimeout ベースで進行させる (requestAnimationFrame はタブが非表示/非合成のとき
    // 完全に停止することがあり、その間ずっとフェーズが進まなくなってしまうため採用しない)。
    let timerId = 0;
    let start = 0;
    let settled = false;

    const cleanupDot = () => {
      if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      path.style.strokeDashoffset = '0';
      cleanupDot();
      window.clearTimeout(timerId);
      resolve();
    };

    if (signal) {
      if (signal.aborted) {
        finish();
        return;
      }
      signal.addEventListener('abort', finish, { once: true });
    }

    const step = (ts: number) => {
      if (settled) return;
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(1, elapsed / durationMs);
      path.style.strokeDashoffset = String(length * (1 - progress));
      if (dot) {
        const idx = Math.min(dotFrames.length - 1, Math.floor(progress * (dotFrames.length - 1)));
        dot.setAttribute('cx', String(dotFrames[idx].x));
        dot.setAttribute('cy', String(dotFrames[idx].y));
      }
      if (progress >= 1) {
        finish();
        return;
      }
      timerId = window.setTimeout(() => step(performance.now()), 16);
    };
    timerId = window.setTimeout(() => step(performance.now()), 0);
  });
}

/** 判定 OK 時: ユーザーの軌跡を参照ストロークの形にスナップする */
export function snapToReference(trailPath: SVGPathElement, referenceD: string, durationMs = 120): Promise<void> {
  trailPath.classList.add('stroke-trail-snap');
  trailPath.setAttribute('d', referenceD);
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

/** 判定 NG 時: 軌跡をふわっとフェードアウトして取り除く */
export function fadeOutTrail(trailPath: SVGPathElement, durationMs = 250): Promise<void> {
  trailPath.classList.add('stroke-trail-fade');
  return new Promise((resolve) => {
    window.setTimeout(() => {
      trailPath.remove();
      resolve();
    }, durationMs);
  });
}

/** 書字エリア全体を軽く揺らす */
export function shakeElement(target: HTMLElement | SVGSVGElement, durationMs = 350): Promise<void> {
  target.classList.add('shake');
  return new Promise((resolve) => {
    window.setTimeout(() => {
      target.classList.remove('shake');
      resolve();
    }, durationMs);
  });
}

/** 要素を指定回数フラッシュ点滅させる (wrong-order / wrong-direction 訂正) */
export function flashElement(target: Element, times = 3, intervalMs = 220): Promise<void> {
  return new Promise((resolve) => {
    let count = 0;
    const toggle = () => {
      target.classList.toggle('flash-on');
      count += 1;
      if (count >= times * 2) {
        target.classList.remove('flash-on');
        resolve();
        return;
      }
      window.setTimeout(toggle, intervalMs / 2);
    };
    toggle();
  });
}

/** 画数ぶんの進捗ドット (上部インジケータ) を生成する */
export function renderProgressDots(
  container: HTMLElement,
  strokeCount: number,
  currentIndex: number,
  phase: 'watch' | 'trace' | 'solo' | 'complete'
): void {
  container.innerHTML = '';
  for (let i = 0; i < strokeCount; i++) {
    const dot = document.createElement('span');
    let state: 'done' | 'current' | 'upcoming' = 'upcoming';
    if (phase === 'complete' || i < currentIndex) {
      state = 'done';
    } else if (i === currentIndex && phase !== 'watch') {
      state = 'current';
    }
    dot.className = `progress-dot progress-dot-${state}`;
    container.appendChild(dot);
  }
}
