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

  container.append(mascot, logo, subtitle, startBtn, muteBtn);

  return function unmount(): void {
    container.innerHTML = '';
    container.classList.remove('title-screen');
  };
}
