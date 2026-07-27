/**
 * 効果音 (WebAudio 合成、音声ファイルなし)。
 * ミュート状態はここで保持し、ミュート中は AudioContext にすら触れずスキップする。
 * 状態の永続化は呼び出し側 (title 画面) が lib/storage.ts で行う。
 *
 * AudioContext は autoplay 制限を避けるため、初回の再生要求 (= ユーザー操作起点の呼び出し) まで
 * 生成しない。生成後は suspended なら都度 resume() を試みる。
 */

let muted = false;
let ctx: AudioContext | null = null;

export function setAudioMuted(value: boolean): void {
  muted = value;
}

export function isAudioMuted(): boolean {
  return muted;
}

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  // AudioContext は lib.dom.d.ts ではグローバル (ambient) 宣言のため Window のプロパティとしては
  // 型付けされていない。Safari 向けの webkitAudioContext フォールバックのみ Window 経由で参照する
  if (typeof AudioContext !== 'undefined') return AudioContext;
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return w.webkitAudioContext;
}

/** 遅延生成した AudioContext を返す。未対応環境では null */
function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

interface ToneOptions {
  type?: OscillatorType;
  /** 開始周波数 (Hz) */
  freqStart: number;
  /** 終了周波数 (Hz)。省略時は freqStart のまま一定 */
  freqEnd?: number;
  /** AudioContext.currentTime を基準にした開始時刻 (秒) */
  startTime: number;
  /** 音の長さ (秒) */
  duration: number;
  /** 山なりのゲイン (音量) の最大値。既定 0.22 */
  peakGain?: number;
}

/** 1音ぶんの oscillator + gain envelope をスケジュールする共通ヘルパー */
function scheduleTone(audioCtx: AudioContext, opts: ToneOptions): void {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freqStart, opts.startTime);
  if (opts.freqEnd !== undefined && opts.freqEnd !== opts.freqStart) {
    osc.frequency.linearRampToValueAtTime(opts.freqEnd, opts.startTime + opts.duration);
  }
  const peak = opts.peakGain ?? 0.22;
  const attack = Math.min(0.02, opts.duration / 4);
  gain.gain.setValueAtTime(0, opts.startTime);
  gain.gain.linearRampToValueAtTime(peak, opts.startTime + attack);
  gain.gain.linearRampToValueAtTime(0, opts.startTime + opts.duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(opts.startTime);
  osc.stop(opts.startTime + opts.duration + 0.02);
}

/** 画正解: 短いポップ (ピッチ上昇 sine 80ms) */
export function playPop(): void {
  if (muted) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  scheduleTone(audioCtx, { type: 'sine', freqStart: 520, freqEnd: 920, startTime: t0, duration: 0.08, peakGain: 0.24 });
}

/** ミス: 柔らかい「ぽよん」(下降 2音。ブザー音は使わない) */
export function playOops(): void {
  if (muted) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  scheduleTone(audioCtx, { type: 'sine', freqStart: 480, freqEnd: 360, startTime: t0, duration: 0.14, peakGain: 0.18 });
  scheduleTone(audioCtx, {
    type: 'sine',
    freqStart: 360,
    freqEnd: 260,
    startTime: t0 + 0.1,
    duration: 0.18,
    peakGain: 0.16,
  });
}

/** 完走: 明るいアルペジオ ファンファーレ (0.6秒程度) */
export function playSuccess(): void {
  if (muted) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const noteDuration = 0.16;
  notes.forEach((freq, i) => {
    scheduleTone(audioCtx, {
      type: 'triangle',
      freqStart: freq,
      startTime: t0 + i * 0.12,
      duration: noteDuration,
      peakGain: 0.22,
    });
  });
}

/** ステッカー獲得: 上昇グリッサンド + キラキラ */
export function playSticker(): void {
  if (muted) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  scheduleTone(audioCtx, {
    type: 'sine',
    freqStart: 300,
    freqEnd: 1200,
    startTime: t0,
    duration: 0.35,
    peakGain: 0.2,
  });
  const twinkleFreqs = [1500, 1800, 2100, 1700];
  twinkleFreqs.forEach((freq, i) => {
    scheduleTone(audioCtx, {
      type: 'triangle',
      freqStart: freq,
      startTime: t0 + 0.18 + i * 0.09,
      duration: 0.09,
      peakGain: 0.12,
    });
  });
}

/** ボタン: ごく短いクリック */
export function playTap(): void {
  if (muted) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  scheduleTone(audioCtx, { type: 'sine', freqStart: 900, freqEnd: 700, startTime: t0, duration: 0.035, peakGain: 0.14 });
}
