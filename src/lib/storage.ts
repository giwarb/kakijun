/**
 * 進捗 (星・ステッカー・ミュート状態) の localStorage 永続化。
 * 星計算・ステッカー判定などの純ロジックは localStorage/DOM に依存しない関数として切り出し、
 * テスト (storage.test.ts) 対象にする。localStorage を直接読み書きする関数群はそれらを組み合わせるだけ。
 */

import type { CharGroup } from './groups.ts';

const STORAGE_KEY = 'kakijun:v1';

export interface StorageData {
  /** 文字ごとの獲得済み星 (0-3)。未挑戦の文字はキーが存在しない */
  stars: Record<string, number>;
  /** 獲得済みステッカーの CharGroup.id 一覧 */
  stickers: string[];
  muted: boolean;
}

function emptyData(): StorageData {
  return { stars: {}, stickers: [], muted: false };
}

/* ---- 純ロジック (DOM/localStorage 非依存。テスト対象) ---- */

/**
 * れんしゅう完了時のミス数・ヒント数から星 (1-3) を計算する。
 * mistakes===0 && hints===0 -> 3, mistakes<=2 && hints===0 -> 2, それ以外 -> 1。
 */
export function computeStars(mistakes: number, hints: number): number {
  if (mistakes === 0 && hints === 0) return 3;
  if (mistakes <= 2 && hints === 0) return 2;
  return 1;
}

/** 既存の星と新しい星のうち、大きいほうを返す (記録は上書きではなく最高値更新) */
export function mergeStars(current: number | undefined, next: number): number {
  return Math.max(current ?? 0, next);
}

/** 星の記録から、全文字が星1以上になっているグループの id 一覧を返す */
export function computeEarnedStickerIds(groups: CharGroup[], stars: Record<string, number>): string[] {
  return groups.filter((g) => g.chars.every((c) => (stars[c] ?? 0) >= 1)).map((g) => g.id);
}

/** 星として妥当な値か (0-3 の有限整数か) を判定する */
function isValidStarValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3;
}

/**
 * 進捗リセット (T008): stars/stickers を初期化したデータを返す。muted は引き継いで保持する
 * (ミュート設定はユーザーの機器設定に近く、記録リセットの対象外とする)。
 */
export function resetProgressData(data: StorageData): StorageData {
  return { stars: {}, stickers: [], muted: data.muted };
}

/**
 * localStorage から読み出した生文字列を StorageData にパースする。
 * JSON 破損・想定外の形でも例外を投げず、壊れているフィールド (または壊れている要素) だけ
 * 初期値/除外にフォールバックする。stars は各値を検証し、0-3 の有限整数でないものは無視する
 * (例: 文字列 "3" や NaN、負数、4 以上などが混入していても、その文字だけ星0扱いになる)。
 */
export function parseStorageData(raw: string | null): StorageData {
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyData();

    const rawStars = parsed.stars;
    const stars: Record<string, number> = {};
    if (rawStars && typeof rawStars === 'object' && !Array.isArray(rawStars)) {
      for (const [char, value] of Object.entries(rawStars as Record<string, unknown>)) {
        if (isValidStarValue(value)) stars[char] = value;
      }
    }

    const stickers = Array.isArray(parsed.stickers)
      ? parsed.stickers.filter((s): s is string => typeof s === 'string')
      : [];
    const muted = typeof parsed.muted === 'boolean' ? parsed.muted : false;
    return { stars, stickers, muted };
  } catch {
    return emptyData();
  }
}

/* ---- localStorage 連携 (DOM 依存。ユニットテストはせず e2e / 手動確認で担保) ---- */

function loadData(): StorageData {
  try {
    return parseStorageData(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // localStorage が使えない環境 (プライベートモード等) でも落ちない
    return emptyData();
  }
}

function saveData(data: StorageData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存に失敗しても致命的にしない (容量超過等)
  }
}

/** 文字ごとの獲得済み星 (0-3)。未挑戦なら 0 */
export function getStars(char: string): number {
  return loadData().stars[char] ?? 0;
}

/** 全文字の星一覧 (もじえらび画面のグリッド表示用) */
export function getAllStars(): Record<string, number> {
  return loadData().stars;
}

/** れんしゅう完了時の星を記録する。既存より高いときだけ更新する */
export function recordResult(char: string, stars: number): void {
  const data = loadData();
  data.stars = { ...data.stars, [char]: mergeStars(data.stars[char], stars) };
  saveData(data);
}

/** 獲得済みステッカー (CharGroup.id) 一覧 */
export function getStickers(): string[] {
  return loadData().stickers;
}

/**
 * 現在の星の記録をもとにステッカー獲得状況を再計算し、新たに獲得したグループがあれば保存する。
 * 戻り値は「今回はじめて獲得した」グループ id の一覧 (もうすでに持っているものは含まない)。
 */
export function updateStickers(groups: CharGroup[]): string[] {
  const data = loadData();
  const earned = computeEarnedStickerIds(groups, data.stars);
  const newlyEarned = earned.filter((id) => !data.stickers.includes(id));
  if (newlyEarned.length > 0) {
    data.stickers = Array.from(new Set([...data.stickers, ...earned]));
    saveData(data);
  }
  return newlyEarned;
}

export function isMuted(): boolean {
  return loadData().muted;
}

export function setMuted(muted: boolean): void {
  const data = loadData();
  data.muted = muted;
  saveData(data);
}

/** 星・ステッカーの記録を全消去する (設定画面のリセット用)。muted 設定は保持する */
export function resetProgress(): void {
  saveData(resetProgressData(loadData()));
}
