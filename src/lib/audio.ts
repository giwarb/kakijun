/**
 * 効果音スタブ。本実装 (WebAudio 合成) は T006 で行う。
 * 現時点では呼び出しタイミングのフックとしてのみ機能し、console.debug に留める。
 */

export function playPop(): void {
  console.debug('[audio] pop');
}

export function playSuccess(): void {
  console.debug('[audio] success');
}

export function playOops(): void {
  console.debug('[audio] oops');
}
