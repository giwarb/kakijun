/**
 * ストローク判定エンジン。DOM に依存しない純関数のみ。
 * 6歳児が指・マウスで雑に描くことを前提に、判定は甘め。
 */

import {
  type Point,
  averagePointwiseDistance,
  distance,
  pathLength,
  resample,
  reversePoints,
} from './geometry.ts';

export type { Point } from './geometry.ts';

export type FailReason = 'wrong-start' | 'wrong-direction' | 'wrong-shape' | 'wrong-order';

export interface MatchResult {
  ok: boolean;
  score: number; // 0-100
  reason?: FailReason; // ok=false のとき必須
  matchedStroke?: number; // reason='wrong-order' のとき、実際に描いてしまった画の index
}

export interface MatcherOptions {
  leniency?: number; // 1.0=標準(子ども向けに甘め)。大きいほど甘い
}

/** ストロークの参照座標系(strokes.json の viewBox) */
const BOX_SIZE = 109;
/** ユーザー入力・参照ストロークをリサンプリングする点数 */
const RESAMPLE_POINTS = 32;

// 距離しきい値は文字サイズ (BOX_SIZE) に対する比で定義し、leniency を掛ける。
/** 形状が一致していると見なす平均対応点距離のしきい値 (比率) */
const SHAPE_DIST_RATIO = 0.16;
/** 始点距離がこれを超えたら「始点だけ外れている」候補とみなすしきい値 (比率) */
const START_DIST_RATIO = 0.2;
/** 入力の長さが期待ストロークの何割未満なら「短すぎる」とみなすか */
const SHORT_LENGTH_RATIO = 0.2;
/** 逆順の平均距離が正順よりこの倍率以上小さければ「逆方向」と判定する */
const DIRECTION_BETTER_RATIO = 0.75;
/** wrong-start 判定で「始点」とみなす先頭部分の割合(この部分を除いた残りで再評価する) */
const START_SKIP_RATIO = 0.2;

interface Evaluation {
  /** 全対応点の平均距離 */
  avg: number;
  /** 始点同士の距離 */
  startDist: number;
  /** 始点付近を除いた残りの対応点の平均距離 */
  tailAvg: number;
}

function evaluate(userR: Point[], strokeR: Point[]): Evaluation {
  const avg = averagePointwiseDistance(userR, strokeR);
  const startDist = distance(userR[0], strokeR[0]);
  const skip = Math.round(userR.length * START_SKIP_RATIO);
  const tailAvg = averagePointwiseDistance(userR.slice(skip), strokeR.slice(skip));
  return { avg, startDist, tailAvg };
}

/** 距離が 0 で 100 点、しきい値ちょうどで 60 点になるよう線形にスコア化する */
function scoreFromDistance(avgDist: number, threshold: number): number {
  if (threshold <= 0) return avgDist <= 0 ? 100 : 0;
  const ratio = avgDist / threshold;
  const score = 100 - ratio * 40;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * ユーザーが描いたストロークが、いま書くべき画として正しいかを判定する。
 *
 * @param user ユーザーが描いた点列 (109座標系、点数任意・2点以上)
 * @param medians その文字の全ストロークの参照点列
 * @param strokeIndex いま書くべき画 (0-based)
 * @param opts 判定オプション
 */
export function matchStroke(
  user: Point[],
  medians: Point[][],
  strokeIndex: number,
  opts: MatcherOptions = {}
): MatchResult {
  const leniency = opts.leniency ?? 1.0;
  const shapeThreshold = BOX_SIZE * SHAPE_DIST_RATIO * leniency;
  const startThreshold = BOX_SIZE * START_DIST_RATIO * leniency;

  // 不正入力(2点未満)は形状不一致として扱う
  if (user.length < 2 || strokeIndex < 0 || strokeIndex >= medians.length) {
    return { ok: false, score: 0, reason: 'wrong-shape' };
  }

  const expected = medians[strokeIndex];
  const expectedLen = pathLength(expected);
  const userLen = pathLength(user);

  // タップ等、明らかに短すぎる入力は問答無用で不合格
  if (expectedLen > 0 && userLen < expectedLen * SHORT_LENGTH_RATIO) {
    return { ok: false, score: 0, reason: 'wrong-shape' };
  }

  const userR = resample(user, RESAMPLE_POINTS);
  const expectedR = resample(expected, RESAMPLE_POINTS);
  const userRRev = reversePoints(userR);

  const forward = evaluate(userR, expectedR);
  const reverseEval = evaluate(userRRev, expectedR);

  // 逆方向チェック: 逆順にした方が明確に良く、かつそれ自体が十分一致するなら wrong-direction
  if (
    reverseEval.avg <= shapeThreshold &&
    reverseEval.avg < forward.avg * DIRECTION_BETTER_RATIO
  ) {
    return {
      ok: false,
      score: scoreFromDistance(reverseEval.avg, shapeThreshold),
      reason: 'wrong-direction',
    };
  }

  if (forward.avg <= shapeThreshold) {
    return { ok: true, score: scoreFromDistance(forward.avg, shapeThreshold) };
  }

  // 書き順チェック: まだ書いていない別の画に十分一致するか
  let bestOrderMatch: { index: number; avg: number } | null = null;
  for (let i = strokeIndex + 1; i < medians.length; i++) {
    const otherR = resample(medians[i], RESAMPLE_POINTS);
    const avgFwd = averagePointwiseDistance(userR, otherR);
    const avgRev = averagePointwiseDistance(userRRev, otherR);
    const avgBest = Math.min(avgFwd, avgRev);
    if (avgBest <= shapeThreshold && (bestOrderMatch === null || avgBest < bestOrderMatch.avg)) {
      bestOrderMatch = { index: i, avg: avgBest };
    }
  }
  if (bestOrderMatch) {
    return {
      ok: false,
      score: scoreFromDistance(bestOrderMatch.avg, shapeThreshold),
      reason: 'wrong-order',
      matchedStroke: bestOrderMatch.index,
    };
  }

  // 始点だけ大きく外れていて、残りは一致しているか
  if (forward.startDist > startThreshold && forward.tailAvg <= shapeThreshold) {
    return {
      ok: false,
      score: scoreFromDistance(forward.avg, shapeThreshold),
      reason: 'wrong-start',
    };
  }

  return { ok: false, score: scoreFromDistance(forward.avg, shapeThreshold), reason: 'wrong-shape' };
}
