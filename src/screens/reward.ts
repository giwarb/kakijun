/**
 * ごほうび画面。れんしゅう完了ごとに表示する星の演出と、
 * グループ最後の文字を終えたときに挟むステッカー獲得演出。
 * どちらも一定時間で自動的に次へ進む (テンポ重視。ボタンを押しても進める)。
 */

import type { CharGroup } from '../lib/groups.ts';
import { playTap, playSticker } from '../lib/audio.ts';
import { createMascot } from '../lib/mascot.ts';
import { burstConfetti } from '../lib/confetti.ts';

const AUTO_ADVANCE_MS = 3000;
const STICKER_AUTO_ADVANCE_MS = 3500;

export interface RewardScreenProps {
  /** 今回の れんしゅう で獲得した星 (1-3) */
  stars: number;
  /** 「つぎへ」(自動進行含む) */
  onNext: () => void;
  /** 「もういちど」で同じ文字を再挑戦 */
  onRetry: () => void;
}

function starRow(stars: number): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'reward-stars';
  for (let i = 0; i < 3; i++) {
    const starEl = document.createElement('span');
    starEl.className = 'reward-star' + (i < stars ? ' filled' : '');
    starEl.textContent = i < stars ? '★' : '☆';
    // ポンポンと出てくるように1つずつ遅延させる
    starEl.style.animationDelay = `${i * 150}ms`;
    row.appendChild(starEl);
  }
  return row;
}

/** ごほうび画面 (星) をマウントする */
export function mountRewardScreen(container: HTMLElement, props: RewardScreenProps): () => void {
  container.innerHTML = '';
  container.classList.add('reward-screen');
  container.dataset.stars = String(props.stars);

  // 文字完走のごほうび: よろこびで跳ねるマスコット + 紙吹雪 (prefers-reduced-motion では無効)
  const mascot = createMascot('happy', { className: 'reward-mascot mascot-bounce' });

  const message = document.createElement('div');
  message.className = 'reward-message';
  message.textContent = 'よくできました!';

  container.append(mascot, message, starRow(props.stars));
  // コンテンツを積んだ後に紙吹雪を発火する (canvas がコンテンツより後に追加されるようにするため)
  burstConfetti(container);

  const actions = document.createElement('div');
  actions.className = 'reward-actions';

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'reward-retry-btn';
  retryBtn.textContent = 'もういちど';
  retryBtn.addEventListener('click', () => {
    if (!markHandled()) return;
    playTap();
    props.onRetry();
  });

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'reward-next-btn';
  nextBtn.textContent = 'つぎへ';
  nextBtn.addEventListener('click', () => {
    if (!markHandled()) return;
    playTap();
    props.onNext();
  });

  actions.append(retryBtn, nextBtn);
  container.appendChild(actions);

  // 連打ガード: ボタン連打や「自動進行タイマーの発火」と「ボタン押下」が重なっても
  // onNext/onRetry が二重に呼ばれないようにする (呼ばれるのは最初の1回だけ)
  let handled = false;
  function markHandled(): boolean {
    if (handled) return false;
    handled = true;
    window.clearTimeout(timer);
    retryBtn.disabled = true;
    nextBtn.disabled = true;
    return true;
  }

  const timer = window.setTimeout(() => {
    if (!markHandled()) return;
    props.onNext();
  }, AUTO_ADVANCE_MS);

  return function unmount(): void {
    window.clearTimeout(timer);
    container.innerHTML = '';
    container.classList.remove('reward-screen');
    delete container.dataset.stars;
  };
}

export interface StickerScreenProps {
  group: CharGroup;
  onContinue: () => void;
}

/** グループ達成ステッカー獲得画面をマウントする */
export function mountStickerScreen(container: HTMLElement, props: StickerScreenProps): () => void {
  container.innerHTML = '';
  container.classList.add('sticker-screen');
  container.dataset.stickerId = props.group.id;

  // ステッカー獲得は文字完走よりさらに嬉しい瞬間: 多めでゆっくりの紙吹雪 + 専用の効果音
  playSticker();
  const mascot = createMascot('happy', { className: 'reward-mascot mascot-bounce' });

  const message = document.createElement('div');
  message.className = 'sticker-message';
  message.textContent = `「${props.group.label}」コンプリート!`;

  const badge = document.createElement('div');
  badge.className = 'sticker-badge';
  badge.textContent = props.group.emoji;

  const sub = document.createElement('div');
  sub.className = 'sticker-sub';
  sub.textContent = 'ステッカーを ゲットしたよ!';

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.className = 'sticker-continue-btn';
  continueBtn.textContent = 'つぎへ';
  continueBtn.addEventListener('click', () => {
    if (!markHandled()) return;
    playTap();
    props.onContinue();
  });

  container.append(mascot, message, badge, sub, continueBtn);
  // コンテンツを積んだ後に紙吹雪を発火する (canvas がコンテンツより後に追加されるようにするため)
  burstConfetti(container, { count: 200, durationMs: 2500, gentle: true });

  // 連打ガード (mountRewardScreen と同じ考え方): onContinue が二重に呼ばれないようにする
  let handled = false;
  function markHandled(): boolean {
    if (handled) return false;
    handled = true;
    window.clearTimeout(timer);
    continueBtn.disabled = true;
    return true;
  }

  const timer = window.setTimeout(() => {
    if (!markHandled()) return;
    props.onContinue();
  }, STICKER_AUTO_ADVANCE_MS);

  return function unmount(): void {
    window.clearTimeout(timer);
    container.innerHTML = '';
    container.classList.remove('sticker-screen');
    delete container.dataset.stickerId;
  };
}
