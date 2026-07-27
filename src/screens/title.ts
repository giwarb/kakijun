/**
 * タイトル画面。ロゴ風の表示 + 「はじめる」ボタン + ミュートボタン。
 */

import { isMuted, setMuted } from '../lib/storage.ts';
import { playTap, setAudioMuted } from '../lib/audio.ts';
import { createMascot } from '../lib/mascot.ts';

export interface TitleScreenProps {
  onStart: () => void;
}

export function mountTitleScreen(container: HTMLElement, props: TitleScreenProps): () => void {
  container.innerHTML = '';
  container.classList.add('title-screen');

  // 大きく登場し、ゆらゆら idle アニメで待つ (prefers-reduced-motion は CSS 側で無効化)
  const mascot = createMascot('normal', { className: 'title-mascot mascot-idle' });

  const logo = document.createElement('div');
  logo.className = 'title-logo';
  logo.textContent = 'かきじゅん';

  const subtitle = document.createElement('div');
  subtitle.className = 'title-subtitle';
  subtitle.textContent = 'ひらがな・すうじの れんしゅう';

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'title-start-btn';
  startBtn.textContent = 'はじめる';
  startBtn.addEventListener('click', () => {
    playTap();
    props.onStart();
  });

  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.className = 'mute-btn';

  function renderMuteBtn(muted: boolean): void {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', muted ? 'おとを だす' : 'おとを けす');
    muteBtn.classList.toggle('muted', muted);
  }

  renderMuteBtn(isMuted());
  muteBtn.addEventListener('click', () => {
    const next = !isMuted();
    setMuted(next);
    setAudioMuted(next);
    // ミュート解除の操作音自体は次の setAudioMuted 反映後に鳴らす (ミュートへの切替時は鳴らさない)
    if (!next) playTap();
    renderMuteBtn(next);
  });

  // クレジット (T007): 隅に小さく「©」ボタン。6歳児の主要動線 (はじめる) の
  // 邪魔にならないよう、他のボタンより小さくして画面隅に固定表示する。
  const creditBtn = document.createElement('button');
  creditBtn.type = 'button';
  creditBtn.className = 'credit-btn';
  creditBtn.textContent = '©';
  creditBtn.setAttribute('aria-label', 'クレジットを みる');

  let creditOverlay: HTMLDivElement | null = null;

  function closeCredit(): void {
    creditOverlay?.remove();
    creditOverlay = null;
  }

  function openCredit(): void {
    if (creditOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'credit-modal-overlay';
    // 背景 (オーバーレイ) をタップしても閉じられるようにする
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeCredit();
    });

    const modal = document.createElement('div');
    modal.className = 'credit-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'クレジット');

    const heading = document.createElement('div');
    heading.className = 'credit-modal-heading';
    heading.textContent = 'クレジット';

    const body = document.createElement('p');
    body.className = 'credit-modal-body';
    body.textContent = 'かきじゅんデータ: KanjiVG © Ulrich Apel (CC BY-SA 3.0)';

    const link = document.createElement('a');
    link.className = 'credit-modal-link';
    link.href = 'https://kanjivg.tagaini.net/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'kanjivg.tagaini.net';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'credit-modal-close';
    closeBtn.textContent = 'とじる';
    closeBtn.addEventListener('click', () => {
      playTap();
      closeCredit();
    });

    modal.append(heading, body, link, closeBtn);
    overlay.appendChild(modal);
    container.appendChild(overlay);
    creditOverlay = overlay;
  }

  creditBtn.addEventListener('click', () => {
    playTap();
    openCredit();
  });

  container.append(mascot, logo, subtitle, startBtn, muteBtn, creditBtn);

  return function unmount(): void {
    container.innerHTML = '';
    container.classList.remove('title-screen');
  };
}
