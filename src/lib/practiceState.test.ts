import { describe, expect, it } from 'vitest';
import { PracticeState } from './practiceState.ts';

describe('PracticeState', () => {
  it('初期状態は watch フェーズ', () => {
    const state = new PracticeState(3);
    const snap = state.getSnapshot();
    expect(snap.phase).toBe('watch');
    expect(snap.strokeIndex).toBe(0);
    expect(snap.strokeCount).toBe(3);
    expect(snap.totalMistakes).toBe(0);
    expect(snap.totalHints).toBe(0);
  });

  it('finishWatching で trace フェーズに進む', () => {
    const state = new PracticeState(2);
    state.finishWatching();
    expect(state.getSnapshot().phase).toBe('trace');
    expect(state.getSnapshot().strokeIndex).toBe(0);
  });

  it('skipWatching も trace フェーズへ進める (タップスキップ)', () => {
    const state = new PracticeState(2);
    state.skipWatching();
    expect(state.getSnapshot().phase).toBe('trace');
  });

  it('watch フェーズ中に recordStrokeResult を呼んでも無視される', () => {
    const state = new PracticeState(2);
    const outcome = state.recordStrokeResult(true);
    expect(outcome.advanced).toBe(false);
    expect(state.getSnapshot().phase).toBe('watch');
    expect(state.getSnapshot().totalMistakes).toBe(0);
  });

  it('trace フェーズで全画正解すると solo フェーズへ進む', () => {
    const state = new PracticeState(2);
    state.finishWatching();

    let outcome = state.recordStrokeResult(true);
    expect(outcome.advanced).toBe(true);
    expect(state.getSnapshot().phase).toBe('trace');
    expect(state.getSnapshot().strokeIndex).toBe(1);

    outcome = state.recordStrokeResult(true);
    expect(outcome.advanced).toBe(true);
    expect(state.getSnapshot().phase).toBe('solo');
    expect(state.getSnapshot().strokeIndex).toBe(0);
  });

  it('solo フェーズで全画正解すると complete になり結果を返す', () => {
    const state = new PracticeState(1);
    state.finishWatching(); // -> trace, strokeIndex 0 (1画のみなので即 solo へ)
    state.recordStrokeResult(true); // trace の唯一の画 -> solo へ
    expect(state.getSnapshot().phase).toBe('solo');

    state.recordStrokeResult(true); // solo の唯一の画 -> complete へ
    expect(state.isComplete()).toBe(true);
    expect(state.getResult()).toEqual({ mistakes: 0, hints: 0 });
  });

  it('失敗すると mistakes が増え、画は進まない', () => {
    const state = new PracticeState(2);
    state.finishWatching();
    const outcome = state.recordStrokeResult(false);
    expect(outcome.advanced).toBe(false);
    expect(outcome.hintTriggered).toBe(false);
    expect(state.getSnapshot().strokeIndex).toBe(0);
    expect(state.getSnapshot().totalMistakes).toBe(1);
    expect(state.getSnapshot().missStreak).toBe(1);
  });

  it('同じ画で3回連続失敗すると hintTriggered になり missStreak がリセットされる', () => {
    const state = new PracticeState(1);
    state.finishWatching();
    state.recordStrokeResult(false);
    state.recordStrokeResult(false);
    const outcome = state.recordStrokeResult(false);
    expect(outcome.hintTriggered).toBe(true);
    expect(state.getSnapshot().totalHints).toBe(1);
    expect(state.getSnapshot().missStreak).toBe(0);
    expect(state.getSnapshot().totalMistakes).toBe(3);
  });

  it('失敗の連続が3回に達する前に成功すると missStreak がリセットされヒントは発生しない', () => {
    const state = new PracticeState(1);
    state.finishWatching();
    state.recordStrokeResult(false);
    state.recordStrokeResult(false);
    const outcome = state.recordStrokeResult(true);
    expect(outcome.hintTriggered).toBe(false);
    expect(state.getSnapshot().totalHints).toBe(0);
  });

  it('mistakes と hints は複数画・複数フェーズをまたいで累積する', () => {
    const state = new PracticeState(2);
    state.finishWatching();
    // stroke 0 (trace): 3連続失敗でヒント、その後成功
    state.recordStrokeResult(false);
    state.recordStrokeResult(false);
    state.recordStrokeResult(false);
    state.recordStrokeResult(true);
    // stroke 1 (trace): 1回失敗して成功 -> solo へ
    state.recordStrokeResult(false);
    state.recordStrokeResult(true);
    expect(state.getSnapshot().phase).toBe('solo');
    // solo: 2画とも一発成功
    state.recordStrokeResult(true);
    state.recordStrokeResult(true);

    expect(state.isComplete()).toBe(true);
    expect(state.getResult()).toEqual({ mistakes: 4, hints: 1 });
  });

  it('strokeCount が 0 以下だとエラーになる', () => {
    expect(() => new PracticeState(0)).toThrow();
    expect(() => new PracticeState(-1)).toThrow();
  });
});
