/**
 * タイトル画面。ロゴ風の表示 + 「はじめる」ボタン + ミュートボタン。
 */

import { isMuted, setMuted } from '../lib/storage.ts';
import { setAudioMuted } from '../lib/audio.ts';

export interface TitleScreenProps {
  onStart: () => void;
}

export function mountTitleScreen(container: HTMLElement, props: TitleScreenProps): () => void {
  container.innerHTML = '';
  container.classList.add('title-screen');

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
  startBtn.addEventListener('click', () => props.onStart());

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
    renderMuteBtn(next);
  });

  container.append(logo, subtitle, startBtn, muteBtn);

  return function unmount(): void {
    container.innerHTML = '';
    container.classList.remove('title-screen');
  };
}
