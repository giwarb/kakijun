// tools/build-strokes.mjs が生成する src/data/strokes.json の型定義。

/** 1文字ぶんの書き順データ */
export interface CharStrokeData {
  /** 各ストロークの SVG パス (`d` 属性の値)。書き順どおりの並び */
  strokes: string[];
  /** 各ストロークを等間隔32点にサンプリングした中心線 ([x, y] の配列)。strokes と同じ並び・同じ要素数 */
  medians: [number, number][][];
}

/** src/data/strokes.json 全体の型 */
export interface StrokeData {
  version: number;
  source: string;
  /** SVG の正方形 viewBox の一辺の長さ (KanjiVG は 109) */
  viewBox: number;
  chars: Record<string, CharStrokeData>;
}
