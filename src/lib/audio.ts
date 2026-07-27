/**
 * 効果音スタブ。本実装 (WebAudio 合成) は T006 で行う。
 * 現時点では呼び出しタイミングのフックとしてのみ機能し、console.debug に留める。
 * ミュート状態はここで保持し、ミュート中は再生 (console.debug) 自体をスキップする。
 * 状態の永続化は呼び出し側 (title 画面) が lib/storage.ts で行う。
 */

let muted = false;

export function setAudioMuted(value: boolean): void {
  muted = value;
}

export function isAudioMuted(): boolean {
  return muted;
}

export function playPop(): void {
  if (muted) return;
  console.debug('[audio] pop');
}

export function playSuccess(): void {
  if (muted) return;
  console.debug('[audio] success');
}

export function playOops(): void {
  if (muted) return;
  console.debug('[audio] oops');
}
