import { describe, expect, it } from 'vitest';
import {
  averagePointwiseDistance,
  distance,
  pathLength,
  resample,
  reversePoints,
  type Point,
} from './geometry.ts';

describe('distance', () => {
  it('computes euclidean distance (3-4-5 triangle)', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('is 0 for identical points', () => {
    expect(distance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
  });
});

describe('pathLength', () => {
  it('sums segment lengths along a polyline', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 0 },
    ];
    expect(pathLength(points)).toBeCloseTo(5 + 4);
  });

  it('is 0 for a single point', () => {
    expect(pathLength([{ x: 5, y: 5 }])).toBe(0);
  });
});

describe('reversePoints', () => {
  it('reverses order without mutating the input', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const reversed = reversePoints(points);
    expect(reversed).toEqual([
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ]);
    // 元の配列は変更されない
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });
});

describe('resample', () => {
  it('returns exactly n points', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ];
    expect(resample(points, 32)).toHaveLength(32);
  });

  it('preserves the first and last point', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 30, y: -5 },
    ];
    const result = resample(points, 32);
    expect(result[0]).toEqual(points[0]);
    expect(result[result.length - 1].x).toBeCloseTo(points[points.length - 1].x);
    expect(result[result.length - 1].y).toBeCloseTo(points[points.length - 1].y);
  });

  it('spaces points evenly by arc length along a straight line', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = resample(points, 5);
    expect(result.map((p) => Math.round(p.x))).toEqual([0, 25, 50, 75, 100]);
  });

  it('duplicates the single point n times when input has only one point', () => {
    const result = resample([{ x: 3, y: 4 }], 4);
    expect(result).toEqual([
      { x: 3, y: 4 },
      { x: 3, y: 4 },
      { x: 3, y: 4 },
      { x: 3, y: 4 },
    ]);
  });

  it('duplicates the point n times when all points are identical (zero length path)', () => {
    const points: Point[] = [
      { x: 7, y: 7 },
      { x: 7, y: 7 },
      { x: 7, y: 7 },
    ];
    const result = resample(points, 4);
    expect(result).toEqual([
      { x: 7, y: 7 },
      { x: 7, y: 7 },
      { x: 7, y: 7 },
      { x: 7, y: 7 },
    ]);
  });
});

describe('averagePointwiseDistance', () => {
  it('averages the per-index distance of two equal-length point lists', () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const b: Point[] = [
      { x: 3, y: 4 },
      { x: 6, y: 8 },
    ];
    expect(averagePointwiseDistance(a, b)).toBeCloseTo((5 + 10) / 2);
  });

  it('is 0 for identical lists', () => {
    const a: Point[] = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    expect(averagePointwiseDistance(a, a)).toBe(0);
  });
});
