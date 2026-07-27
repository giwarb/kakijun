/**
 * れんしゅう画面のフェーズ・ストローク進行・ミス数/ヒント数を管理する純ロジック。
 * DOM に依存しない (テスト対象)。描画・判定 (matchStroke) の呼び出しは practice.ts 側で行う。
 */

/** 練習の3フェーズ + 完了 */
export type Phase = 'watch' | 'trace' | 'solo' | 'complete';

/** 練習完了時にコールバックへ渡す集計結果 */
export interface PracticeResult {
  /** 失敗した回数の合計 (画をまたいで集計) */
  mistakes: number;
  /** ヒント (お手本再生) が発動した回数の合計 */
  hints: number;
}

/** 現在の状態のスナップショット (表示側が参照する) */
export interface PracticeStateSnapshot {
  phase: Phase;
  /** 現在のフェーズ内で書くべき画の index (0-based)。phase='watch'/'complete' のときは意味を持たない */
  strokeIndex: number;
  /** 総画数 */
  strokeCount: number;
  /** 現在の画についての連続失敗回数 (ヒント判定用) */
  missStreak: number;
  totalMistakes: number;
  totalHints: number;
}

/** 何回連続で失敗したらヒント (お手本再生) を出すか */
const MISTAKES_BEFORE_HINT = 3;

/** 1画分の判定結果を記録したときに、呼び出し側へ伝える指示 */
export interface RecordOutcome {
  /** この画が確定して次の画 (または次フェーズ/完了) へ進んだか */
  advanced: boolean;
  /** ヒント (お手本アニメの自動再生) を出すべきか */
  hintTriggered: boolean;
  /** 記録後の状態のスナップショット */
  snapshot: PracticeStateSnapshot;
}

export class PracticeState {
  private readonly strokeCount: number;
  private phase: Phase = 'watch';
  private strokeIndex = 0;
  private missStreak = 0;
  private totalMistakes = 0;
  private totalHints = 0;

  constructor(strokeCount: number) {
    if (strokeCount <= 0) {
      throw new Error('strokeCount must be a positive integer');
    }
    this.strokeCount = strokeCount;
  }

  getSnapshot(): PracticeStateSnapshot {
    return {
      phase: this.phase,
      strokeIndex: this.strokeIndex,
      strokeCount: this.strokeCount,
      missStreak: this.missStreak,
      totalMistakes: this.totalMistakes,
      totalHints: this.totalHints,
    };
  }

  /** みてね (お手本アニメ) が全画終わった、またはタップでスキップされた */
  finishWatching(): void {
    if (this.phase !== 'watch') return;
    this.phase = 'trace';
    this.strokeIndex = 0;
    this.missStreak = 0;
  }

  /** タップによる みてね スキップ (要件2)。finishWatching のエイリアス */
  skipWatching(): void {
    this.finishWatching();
  }

  /**
   * いま書くべき画についての判定結果 (matchStroke の ok) を記録する。
   * trace/solo フェーズ以外での呼び出しは無視して現在のスナップショットを返す。
   */
  recordStrokeResult(ok: boolean): RecordOutcome {
    if (this.phase !== 'trace' && this.phase !== 'solo') {
      return { advanced: false, hintTriggered: false, snapshot: this.getSnapshot() };
    }

    if (ok) {
      this.missStreak = 0;
      this.advanceStroke();
      return { advanced: true, hintTriggered: false, snapshot: this.getSnapshot() };
    }

    this.totalMistakes += 1;
    this.missStreak += 1;

    if (this.missStreak >= MISTAKES_BEFORE_HINT) {
      this.totalHints += 1;
      this.missStreak = 0;
      return { advanced: false, hintTriggered: true, snapshot: this.getSnapshot() };
    }

    return { advanced: false, hintTriggered: false, snapshot: this.getSnapshot() };
  }

  private advanceStroke(): void {
    if (this.strokeIndex + 1 < this.strokeCount) {
      this.strokeIndex += 1;
      return;
    }

    // このフェーズの最後の画を書き終えた
    if (this.phase === 'trace') {
      this.phase = 'solo';
      this.strokeIndex = 0;
    } else if (this.phase === 'solo') {
      this.phase = 'complete';
      this.strokeIndex = 0;
    }
  }

  isComplete(): boolean {
    return this.phase === 'complete';
  }

  getResult(): PracticeResult {
    return { mistakes: this.totalMistakes, hints: this.totalHints };
  }
}
