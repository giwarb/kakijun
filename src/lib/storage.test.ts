import { describe, expect, it } from 'vitest';
import {
  computeEarnedStickerIds,
  computeStars,
  mergeStars,
  parseStorageData,
  resetProgressData,
} from './storage.ts';
import type { CharGroup } from './groups.ts';

describe('computeStars', () => {
  it('ミスなし・ヒントなしで星3', () => {
    expect(computeStars(0, 0)).toBe(3);
  });

  it('ミス2以下・ヒントなしで星2', () => {
    expect(computeStars(1, 0)).toBe(2);
    expect(computeStars(2, 0)).toBe(2);
  });

  it('ミス3以上、またはヒントありで星1', () => {
    expect(computeStars(3, 0)).toBe(1);
    expect(computeStars(0, 1)).toBe(1);
    expect(computeStars(5, 2)).toBe(1);
  });
});

describe('mergeStars', () => {
  it('既存より高いときだけ更新される', () => {
    expect(mergeStars(1, 3)).toBe(3);
    expect(mergeStars(3, 1)).toBe(3);
    expect(mergeStars(undefined, 2)).toBe(2);
    expect(mergeStars(2, 2)).toBe(2);
  });
});

describe('computeEarnedStickerIds', () => {
  const groups: CharGroup[] = [
    { id: 'g1', tab: 'hiragana', label: 'g1', chars: ['あ', 'い'], emoji: '🐰' },
    { id: 'g2', tab: 'hiragana', label: 'g2', chars: ['か', 'き'], emoji: '🐱' },
  ];

  it('グループ内全文字が星1以上なら獲得', () => {
    const stars = { あ: 1, い: 2 };
    expect(computeEarnedStickerIds(groups, stars)).toEqual(['g1']);
  });

  it('1文字でも星0(未挑戦)があれば未獲得', () => {
    const stars = { あ: 1, い: 0, か: 3 };
    expect(computeEarnedStickerIds(groups, stars)).toEqual([]);
  });

  it('全グループ達成なら両方返す', () => {
    const stars = { あ: 1, い: 1, か: 1, き: 1 };
    expect(computeEarnedStickerIds(groups, stars)).toEqual(['g1', 'g2']);
  });
});

describe('parseStorageData', () => {
  it('null (未保存) なら初期値', () => {
    expect(parseStorageData(null)).toEqual({ stars: {}, stickers: [], muted: false });
  });

  it('壊れた JSON なら初期値にフォールバックする', () => {
    expect(parseStorageData('{not valid json')).toEqual({ stars: {}, stickers: [], muted: false });
  });

  it('想定外の型 (配列など) なら初期値にフォールバックする', () => {
    expect(parseStorageData('[1,2,3]')).toEqual({ stars: {}, stickers: [], muted: false });
  });

  it('正常な保存データを復元する', () => {
    const raw = JSON.stringify({ stars: { あ: 2 }, stickers: ['a'], muted: true });
    expect(parseStorageData(raw)).toEqual({ stars: { あ: 2 }, stickers: ['a'], muted: true });
  });

  it('一部フィールドが欠損/壊れていても他は初期値で補って落ちない', () => {
    const raw = JSON.stringify({ stars: 'oops', muted: 'yes' });
    expect(parseStorageData(raw)).toEqual({ stars: {}, stickers: [], muted: false });
  });

  it('stars の値が不正な文字だけ無視し、他の正常な文字は残す', () => {
    const raw = JSON.stringify({
      stars: { あ: 3, い: '3', う: NaN, え: -1, お: 4, か: 1.5, き: 0 },
      stickers: [],
      muted: false,
    });
    expect(parseStorageData(raw)).toEqual({ stars: { あ: 3, き: 0 }, stickers: [], muted: false });
  });
});

/**
 * resetProgress() 自体は loadData/saveData (localStorage 依存) を組み合わせるだけなので、
 * このファイルの他の localStorage 連携関数と同様にユニットテスト対象外とし (e2e で担保)、
 * 中身の純ロジックである resetProgressData をここでテストする。
 */
describe('resetProgressData', () => {
  it('stars と stickers を初期化し、muted (true) は保持する', () => {
    const data = { stars: { あ: 3, い: 2 }, stickers: ['g1'], muted: true };
    expect(resetProgressData(data)).toEqual({ stars: {}, stickers: [], muted: true });
  });

  it('muted (false) のときも保持される', () => {
    const data = { stars: { あ: 1 }, stickers: ['g1', 'g2'], muted: false };
    expect(resetProgressData(data)).toEqual({ stars: {}, stickers: [], muted: false });
  });

  it('すでに空の記録に対しても安全に初期値を返す', () => {
    expect(resetProgressData({ stars: {}, stickers: [], muted: true })).toEqual({
      stars: {},
      stickers: [],
      muted: true,
    });
  });
});
