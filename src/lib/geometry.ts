/**
 * 点列ユーティリティ。DOM に依存しない純関数のみ。
 */

export interface Point {
  x: number;
  y: number;
}

/** 2 点間のユークリッド距離 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 点列を折れ線とみなした総距離(弧長) */
export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

/** 点列の順序を逆にした新しい配列を返す(元の配列は変更しない) */
export function reversePoints(points: Point[]): Point[] {
  return [...points].reverse();
}

/**
 * 点列を弧長に基づいて等間隔に `n` 点へリサンプリングする。
 * 点が 1 個以下、または全長 0 (すべて同じ座標) の場合は先頭点を n 個複製する。
 */
export function resample(points: Point[], n: number): Point[] {
  if (points.length === 0 || n <= 0) return [];
  if (points.length === 1 || n === 1) {
    return Array.from({ length: n }, () => ({ ...points[0] }));
  }

  const total = pathLength(points);
  if (total === 0) {
    return Array.from({ length: n }, () => ({ ...points[0] }));
  }

  const interval = total / (n - 1);
  const result: Point[] = [{ ...points[0] }];
  let accumulated = 0;

  for (let i = 1; i < points.length && result.length < n; i++) {
    let prev = points[i - 1];
    const curr = points[i];
    let segLen = distance(prev, curr);

    while (accumulated + segLen >= interval && result.length < n) {
      const remain = interval - accumulated;
      const t = segLen === 0 ? 0 : remain / segLen;
      const next: Point = {
        x: prev.x + t * (curr.x - prev.x),
        y: prev.y + t * (curr.y - prev.y),
      };
      result.push(next);
      prev = next;
      segLen = distance(prev, curr);
      accumulated = 0;
    }

    accumulated += segLen;
  }

  // 浮動小数の誤差で 1 点足りないことがあるため、最後の点で埋める
  while (result.length < n) {
    result.push({ ...points[points.length - 1] });
  }
  if (result.length > n) result.length = n;

  return result;
}

/** 同じ長さ(先頭から min 長)の 2 点列について、対応点間距離の平均を返す */
export function averagePointwiseDistance(a: Point[], b: Point[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let total = 0;
  for (let i = 0; i < len; i++) {
    total += distance(a[i], b[i]);
  }
  return total / len;
}
