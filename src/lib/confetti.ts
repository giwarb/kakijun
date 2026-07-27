/**
 * 紙吹雪・キラキラ演出 (Canvas オーバーレイ)。
 * container に一時的な <canvas> を position:absolute で重ね、requestAnimationFrame で
 * パーティクルを描画してから自動的に取り除く (DOM に何も残さない)。
 * prefers-reduced-motion のときは何もしない (呼び出し側は常に呼んでよい)。
 */

const PALETTE = ['#f4a5bd', '#6fa8dc', '#ffd166', '#b5e8b0', '#c9a6ff', '#ff9d5c'];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** container の表示サイズぶんの <canvas> を重ねて追加する (devicePixelRatio 対応) */
function createOverlayCanvas(container: HTMLElement): { canvas: HTMLCanvasElement; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  const rect = container.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  container.appendChild(canvas);
  return { canvas, width, height };
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle';
}

export interface ConfettiOptions {
  /** 粒の数。既定 120 */
  count?: number;
  /** 演出全体の長さ (ms)。既定 1500 */
  durationMs?: number;
  /** true でゆっくり・ふわっと落とす (ステッカー獲得時など) */
  gentle?: boolean;
}

/** 文字完走・ステッカー獲得時の紙吹雪 */
export function burstConfetti(container: HTMLElement, options: ConfettiOptions = {}): void {
  if (prefersReducedMotion()) return;
  const count = options.count ?? 120;
  const durationMs = options.durationMs ?? 1500;
  const gravity = options.gentle ? 55 : 110;
  const spreadSpeed = options.gentle ? 30 : 70;
  const fallSpeed = options.gentle ? 35 : 70;

  const { canvas, width, height } = createOverlayCanvas(container);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  ctx.scale(dpr, dpr);

  const particles: ConfettiParticle[] = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.4,
    vx: (Math.random() - 0.5) * spreadSpeed,
    vy: fallSpeed + Math.random() * spreadSpeed,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * (options.gentle ? 3 : 6),
    size: 4 + Math.random() * 6,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    shape: Math.random() < 0.5 ? 'rect' : 'circle',
  }));

  let start = 0;
  let lastTs = 0;

  function frame(ts: number): void {
    if (!canvas.isConnected) return;
    if (!start) start = ts;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const elapsed = ts - start;
    const alpha = Math.max(0, 1 - elapsed / durationMs);

    ctx!.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += gravity * dt;
      p.rot += p.vrot * dt;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    });

    if (elapsed < durationMs) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  size: number;
  color: string;
}

export interface SparkleOptions {
  /** 粒の数。既定 8 (6-10 目安) */
  count?: number;
  /** 演出全体の長さ (ms)。既定 600 */
  durationMs?: number;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rot: number,
  color: string,
  alpha: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = color;
  ctx.beginPath();
  const spikes = 4;
  const outerR = r;
  const innerR = r * 0.42;
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 1画正解ごとの小さなキラキラ。container 内の座標 (xFrac, yFrac は 0-1 の割合) から星が飛び散る。
 */
export function burstSparkle(container: HTMLElement, xFrac: number, yFrac: number, options: SparkleOptions = {}): void {
  if (prefersReducedMotion()) return;
  const count = options.count ?? 8;
  const durationMs = options.durationMs ?? 600;

  const { canvas, width, height } = createOverlayCanvas(container);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  ctx.scale(dpr, dpr);

  const cx = Math.max(0, Math.min(1, xFrac)) * width;
  const cy = Math.max(0, Math.min(1, yFrac)) * height;

  const particles: SparkleParticle[] = Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 40 + Math.random() * 50;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 3,
      color: PALETTE[i % PALETTE.length],
      rot: Math.random() * Math.PI * 2,
    };
  });

  let start = 0;
  let lastTs = 0;

  function frame(ts: number): void {
    if (!canvas.isConnected) return;
    if (!start) start = ts;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const elapsed = ts - start;
    const t = Math.min(1, elapsed / durationMs);

    ctx!.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      drawStar(ctx!, p.x, p.y, p.size * (1 - t * 0.3), p.rot, p.color, 1 - t);
    });

    if (elapsed < durationMs) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
