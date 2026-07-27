/**
 * タイトル画面。ロゴ風の表示 + 「はじめる」ボタン + ミュートボタン。
 */

import { isMuted, resetProgress, setMuted } from '../lib/storage.ts';
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

  // 進捗リセット (T008): クレジット (©) ボタンの隣に、同じくらい控えめな設定 (⚙) ボタンを置く。
  // 6歳児の主要動線 (はじめる) から外し、誤操作で記録が消えないよう確認モーダルを必ず挟む。
  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.className = 'settings-btn';
  settingsBtn.textContent = '⚙';
  settingsBtn.setAttribute('aria-label', 'きろくを リセットする');

  let resetOverlay: HTMLDivElement | null = null;
  /**
   * 「けす」実行後の自動クローズ (setTimeout) の ID。保持せずに closeReset だけ渡すと、
   * 1200ms 以内に背景タップ等で一旦閉じて⚙から開き直した場合、古いタイマーが
   * 新しく開いたモーダル (resetOverlay の新しい参照) を誤って閉じてしまう。
   * closeReset() 呼び出し時に必ず clearTimeout することで、そのレースを防ぐ。
   */
  let resetCloseTimer = 0;

  function closeReset(): void {
    window.clearTimeout(resetCloseTimer);
    resetOverlay?.remove();
    resetOverlay = null;
  }

  function openReset(): void {
    if (resetOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'reset-modal-overlay';
    // 背景タップは「やめる」扱い (安全側)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        playTap();
        closeReset();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'reset-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'きろくの リセット');

    const heading = document.createElement('div');
    heading.className = 'reset-modal-heading';
    heading.textContent = 'きろくを ぜんぶ けす?';

    const body = document.createElement('p');
    body.className = 'reset-modal-body';
    body.textContent = 'ほしと シールが ぜんぶ きえるよ。';

    const actions = document.createElement('div');
    actions.className = 'reset-modal-actions';

    // 「けす」: 危険色・小さめ (誤タップしにくく)
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'reset-confirm-btn';
    confirmBtn.textContent = 'けす';
    confirmBtn.addEventListener('click', () => {
      playTap();
      resetProgress();
      // 実行後は短くフィードバックしてから自動で閉じる (待たせないテンポ重視の方針)
      heading.textContent = 'きろくを けしたよ';
      body.remove();
      actions.remove();
      window.clearTimeout(resetCloseTimer);
      resetCloseTimer = window.setTimeout(closeReset, 1200);
    });

    // 「やめる」: 安全側・大きめ・デフォルトフォーカス
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'reset-cancel-btn';
    cancelBtn.textContent = 'やめる';
    cancelBtn.addEventListener('click', () => {
      playTap();
      closeReset();
    });

    actions.append(confirmBtn, cancelBtn);
    modal.append(heading, body, actions);
    overlay.appendChild(modal);
    container.appendChild(overlay);
    resetOverlay = overlay;

    cancelBtn.focus();
  }

  settingsBtn.addEventListener('click', () => {
    playTap();
    openReset();
  });

  container.append(mascot, logo, subtitle, startBtn, muteBtn, creditBtn, settingsBtn);

  return function unmount(): void {
    window.clearTimeout(resetCloseTimer);
    container.innerHTML = '';
    container.classList.remove('title-screen');
  };
}
