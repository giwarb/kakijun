import './style.css';
import strokesData from './data/strokes.json';
import type { StrokeData } from './data/types.ts';
import { mountPracticeScreen } from './screens/practice.ts';
import { mountTitleScreen } from './screens/title.ts';
import { mountSelectScreen } from './screens/select.ts';
import { mountRewardScreen, mountStickerScreen } from './screens/reward.ts';
import { findGroupByChar, GROUPS } from './lib/groups.ts';
import { computeStars, isMuted, recordResult, updateStickers } from './lib/storage.ts';
import { setAudioMuted } from './lib/audio.ts';

/**
 * アプリシェル。タイトル → もじえらび → れんしゅう → ごほうび (→ ステッカー) の
 * ステートマシンとして画面遷移を管理する。各画面は container を直接own する
 * mount 関数 (practice.ts と同じ流儀) で、都度 fade in/out するラッパー div に mount する。
 */

const data = strokesData as unknown as StrokeData;
const appEl = document.querySelector<HTMLDivElement>('#app');

const SCREEN_TRANSITION_MS = 220;

if (appEl) {
  // 起動時、保存済みのミュート設定を audio モジュールに反映する
  setAudioMuted(isMuted());

  let currentEl: HTMLDivElement | null = null;
  let currentUnmount: (() => void) | null = null;

  function show(mount: (el: HTMLElement) => () => void): void {
    const prevEl = currentEl;
    const prevUnmount = currentUnmount;

    const nextEl = document.createElement('div');
    nextEl.className = 'screen screen-enter';
    appEl!.appendChild(nextEl);
    const nextUnmount = mount(nextEl);

    currentEl = nextEl;
    currentUnmount = nextUnmount;

    // 追加した直後は screen-enter (opacity: 0) の状態でレイアウトさせ、
    // 次のフレームでクラスを外してフェードインさせる
    requestAnimationFrame(() => {
      nextEl.classList.remove('screen-enter');
    });

    if (prevEl) {
      prevEl.classList.add('screen-leave');
      window.setTimeout(() => {
        prevUnmount?.();
        prevEl.remove();
      }, SCREEN_TRANSITION_MS);
    }
  }

  function showTitle(): void {
    show((el) => mountTitleScreen(el, { onStart: showSelect }));
  }

  function showSelect(): void {
    show((el) =>
      mountSelectScreen(el, {
        onSelect: (char) => showPractice(char),
        onBack: showTitle,
      })
    );
  }

  function showPractice(char: string): void {
    const strokeData = data.chars[char];
    if (!strokeData) {
      console.error(`[main] strokes.json に文字「${char}」のデータがありません`);
      return;
    }
    show((el) =>
      mountPracticeScreen(el, {
        char,
        strokeData,
        onComplete: (result) => {
          const stars = computeStars(result.mistakes, result.hints);
          recordResult(char, stars);
          showReward(char, stars);
        },
      })
    );
  }

  function showReward(char: string, stars: number): void {
    show((el) =>
      mountRewardScreen(el, {
        stars,
        onRetry: () => showPractice(char),
        onNext: () => advanceAfterReward(char),
      })
    );
  }

  /** ごほうびの「つぎへ」: 同グループの次の文字へ。グループ最後ならステッカー演出を挟んでもじえらびへ */
  function advanceAfterReward(char: string): void {
    const group = findGroupByChar(char);
    if (!group) {
      showSelect();
      return;
    }
    const index = group.chars.indexOf(char);
    const isLastInGroup = index === group.chars.length - 1;

    if (!isLastInGroup) {
      showPractice(group.chars[index + 1]);
      return;
    }

    const newlyEarned = updateStickers(GROUPS);
    if (newlyEarned.includes(group.id)) {
      show((el) => mountStickerScreen(el, { group, onContinue: showSelect }));
    } else {
      showSelect();
    }
  }

  showTitle();
}
