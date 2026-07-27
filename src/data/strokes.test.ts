import { describe, expect, it } from 'vitest';
import strokesData from './strokes.json';
import type { StrokeData } from './types';

const data = strokesData as unknown as StrokeData;

const DIGITS = '0123456789';
const HIRAGANA =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
const ALL_CHARS = [...DIGITS, ...HIRAGANA];

describe('strokes.json', () => {
  it('56文字すべてが存在する', () => {
    expect(ALL_CHARS.length).toBe(56);
    for (const ch of ALL_CHARS) {
      expect(data.chars[ch], `missing char: ${ch}`).toBeDefined();
    }
  });

  it('viewBox が 109 である', () => {
    expect(data.viewBox).toBe(109);
  });

  for (const ch of ALL_CHARS) {
    it(`${ch}: strokes と medians の要素数が一致し、各 median が32点で座標が範囲内`, () => {
      const entry = data.chars[ch];
      expect(entry.strokes.length).toBeGreaterThanOrEqual(1);
      expect(entry.medians.length).toBe(entry.strokes.length);

      for (const median of entry.medians) {
        expect(median.length).toBe(32);
        for (const [x, y] of median) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(109);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(109);
        }
      }
    });
  }

  it.each([
    ['あ', 3],
    ['い', 2],
    ['き', 4],
    ['ん', 1],
    ['1', 1],
    ['2', 1],
    ['3', 1],
  ])('画数スポットチェック: %s は %i 画', (ch, expected) => {
    expect(data.chars[ch].strokes.length).toBe(expected);
  });
});
