import { describe, expect, it } from 'vitest';
import { matchStroke, type Point } from './matcher.ts';

// 合成テストデータ: 2画の文字を想定
// stroke 0: ゆるくカーブした斜め線
const strokeDiagonal: Point[] = [
  { x: 30, y: 20 },
  { x: 40, y: 30 },
  { x: 50, y: 45 },
  { x: 60, y: 60 },
  { x: 70, y: 75 },
  { x: 80, y: 90 },
];
// stroke 1: 横線 (stroke 0 とは形も位置も明確に異なる)
const strokeHorizontal: Point[] = [
  { x: 20, y: 85 },
  { x: 35, y: 84 },
  { x: 50, y: 85 },
  { x: 65, y: 86 },
  { x: 80, y: 85 },
  { x: 90, y: 85 },
];
const medians: Point[][] = [strokeDiagonal, strokeHorizontal];

describe('matchStroke', () => {
  it('median そのものを入力すると ok になる', () => {
    const result = matchStroke(strokeDiagonal, medians, 0);
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('少しノイズを加えノードを間引いても ok になる (甘さの担保)', () => {
    const noisy: Point[] = strokeDiagonal
      .filter((_, i) => i % 2 === 0)
      .map((p, i) => ({
        x: p.x + (i % 2 === 0 ? 2 : -2),
        y: p.y + (i % 2 === 0 ? -2 : 2),
      }));
    const result = matchStroke(noisy, medians, 0);
    expect(result.ok).toBe(true);
  });

  it('逆向きに描くと wrong-direction になる', () => {
    const reversed = [...strokeDiagonal].reverse();
    const result = matchStroke(reversed, medians, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('wrong-direction');
  });

  it('2画目を描いてしまうと wrong-order (matchedStroke=1) になる', () => {
    const result = matchStroke(strokeHorizontal, medians, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('wrong-order');
    expect(result.matchedStroke).toBe(1);
  });

  it('始点だけ大きく外れ残りは一致していると wrong-start になる', () => {
    const wrongStart = [{ x: 90, y: 10 }, ...strokeDiagonal.slice(1)];
    const result = matchStroke(wrongStart, medians, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('wrong-start');
  });

  it('全く違う場所の線は不合格になる', () => {
    const farAway: Point[] = [
      { x: 5, y: 100 },
      { x: 10, y: 95 },
      { x: 15, y: 90 },
      { x: 20, y: 85 },
      { x: 25, y: 80 },
    ];
    const result = matchStroke(farAway, medians, 0);
    expect(result.ok).toBe(false);
  });

  it('2点だけの短い入力(タップ)は不合格になる', () => {
    const tap: Point[] = [
      { x: 50, y: 50 },
      { x: 51, y: 50 },
    ];
    const result = matchStroke(tap, medians, 0);
    expect(result.ok).toBe(false);
  });

  it('横線を書くべき所に縦線を描くと不合格になる', () => {
    const vertical: Point[] = [
      { x: 50, y: 60 },
      { x: 50, y: 70 },
      { x: 50, y: 80 },
      { x: 50, y: 90 },
      { x: 50, y: 100 },
    ];
    const result = matchStroke(vertical, medians, 1);
    expect(result.ok).toBe(false);
  });

  it('leniency を大きくすると同じ入力でもより通りやすくなる', () => {
    const slightlyOff = strokeDiagonal.map((p) => ({ x: p.x + 14, y: p.y - 14 }));
    const strict = matchStroke(slightlyOff, medians, 0, { leniency: 1.0 });
    const lenient = matchStroke(slightlyOff, medians, 0, { leniency: 3.0 });
    expect(lenient.score).toBeGreaterThanOrEqual(strict.score);
    expect(lenient.ok).toBe(true);
  });
});

// strokes.json (T002 が生成) が存在する場合のみ実行する統合テスト。
// T002 とは並行開発のため、ファイルが無い環境でも matcher 単体のテストは通る必要がある。
// Node の `fs` は @types/node 未導入のため型解決できない (tsconfig.json は T002 の
// 変更対象なので触らない)。代わりに Vite/Vitest が標準で型付けしている
// `import.meta.glob` を使い、ファイルの有無に応じて動的に読み込む。
interface RawStrokeData {
  chars: Record<string, { medians: [number, number][][] }>;
}

const strokesJsonModules = import.meta.glob<{ default: RawStrokeData }>(
  '../data/strokes.json',
  { eager: true }
);
const strokesJsonModule = Object.values(strokesJsonModules)[0];

(strokesJsonModule ? describe : describe.skip)('strokes.json との統合 (存在する場合のみ)', () => {
  it('「あ」の各画の median を順に入力すると全て ok になる', () => {
    const raw = strokesJsonModule.default;
    const aData = raw.chars['あ'];
    expect(aData).toBeDefined();

    const aMedians: Point[][] = aData.medians.map((stroke) =>
      stroke.map(([x, y]) => ({ x, y }))
    );

    aMedians.forEach((stroke, index) => {
      const result = matchStroke(stroke, aMedians, index);
      expect(result.ok, `stroke ${index} of 「あ」 should be ok`).toBe(true);
    });
  });
});
