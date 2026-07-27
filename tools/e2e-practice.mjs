// アプリシェル (T005) を含めたスモーク E2E。
// 使い方: npm run e2e (事前に `npx playwright install chromium` が必要)
//
// vite の開発サーバーを (プログラム的に) 起動し、Chromium (headless) で
// タイトル画面 →「はじめる」→ もじえらび画面 →「1」を選択 → れんしゅう画面の
// デバッグフック `window.__kakijun.simulateStroke` で全画をなぞり終える →
// ごほうび画面に星が表示される、までの一連のフローを検証する。
//
// ポートは都度空きポートを探して使うため、他の開発サーバーと衝突しない。
import { createServer as createNetServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const TARGET_CHAR = '1';
const TIMEOUT_MS = 30000;

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function loadCharMedians(char) {
  const raw = await readFile(path.join(root, 'src', 'data', 'strokes.json'), 'utf-8');
  const data = JSON.parse(raw);
  const charData = data.chars[char];
  if (!charData) {
    throw new Error(`strokes.json に文字「${char}」のデータがありません`);
  }
  // [number, number][][] -> {x,y}[][]
  return charData.medians.map((stroke) => stroke.map(([x, y]) => ({ x, y })));
}

async function main() {
  const medians = await loadCharMedians(TARGET_CHAR);
  const strokeCount = medians.length;
  console.log(`[e2e] 「${TARGET_CHAR}」の画数: ${strokeCount}`);

  const port = await findFreePort();
  console.log(`[e2e] 空きポート ${port} で dev サーバーを起動します`);

  const viteServer = await createViteServer({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    server: { port, strictPort: true, host: '127.0.0.1' },
    logLevel: 'warn',
  });
  await viteServer.listen();

  const base = process.env.BASE_URL ?? '/kakijun/';
  const url = `http://127.0.0.1:${port}${base}`;
  console.log(`[e2e] URL: ${url}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = browser ? await browser.newPage() : null;
    page.setDefaultTimeout(TIMEOUT_MS);

    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(url, { waitUntil: 'load' });

    // ---- タイトル画面 ----
    await page.waitForSelector('.title-screen .title-start-btn');
    console.log('[e2e] タイトル画面を表示');
    await page.click('.title-screen .title-start-btn');

    // ---- もじえらび画面: 「すうじ」タブがデフォルトで選ばれている想定で「1」を選ぶ ----
    const charSelector = `.select-screen .char-card[data-char="${TARGET_CHAR}"]`;
    await page.waitForSelector(charSelector);
    console.log('[e2e] もじえらび画面を表示');
    await page.click(charSelector);

    // ---- れんしゅう画面 ----
    await page.waitForFunction(() => Boolean(window.__kakijun), undefined, { timeout: TIMEOUT_MS });

    const initialPhase = await page.evaluate(() => window.__kakijun.getPhase());
    console.log(`[e2e] 初期フェーズ: ${initialPhase}`);
    if (initialPhase !== 'watch') {
      throw new Error(`初期フェーズが watch ではありません: ${initialPhase}`);
    }

    // なぞってね (trace) → じぶんで (solo) の順に全画を simulateStroke で正しく描く。
    // simulateStroke は watch フェーズ中なら自動でスキップして trace へ進める。
    const phasesToDrive = ['trace', 'solo'];
    for (const expectedPhaseGroup of phasesToDrive) {
      for (let i = 0; i < strokeCount; i++) {
        const points = medians[i];
        // eslint-disable-next-line no-await-in-loop
        await page.evaluate((pts) => window.__kakijun.simulateStroke(pts), points);
        // eslint-disable-next-line no-await-in-loop
        const phase = await page.evaluate(() => window.__kakijun.getPhase());
        console.log(`[e2e] ${expectedPhaseGroup} stroke ${i} 完了後のフェーズ: ${phase}`);
      }
    }

    const finalPhase = await page.evaluate(() => window.__kakijun.getPhase());
    if (finalPhase !== 'complete') {
      throw new Error(`完了状態に到達しませんでした (最終フェーズ: ${finalPhase})`);
    }

    // ---- ごほうび画面: 星が表示されることを確認 ----
    await page.waitForSelector('.reward-screen');
    const stars = await page.evaluate(() => document.querySelector('.reward-screen')?.getAttribute('data-stars'));
    console.log(`[e2e] ごほうび画面の獲得星: ${stars}`);
    const starsNum = Number(stars);
    if (!Number.isInteger(starsNum) || starsNum < 1 || starsNum > 3) {
      throw new Error(`ごほうび画面の星の値が不正です: ${stars}`);
    }

    if (consoleErrors.length > 0) {
      throw new Error(`ブラウザ側でエラーが発生しました:\n${consoleErrors.join('\n')}`);
    }

    console.log(
      `[e2e] OK: タイトル→もじえらび→「${TARGET_CHAR}」の練習→ごほうび (星${starsNum}) まで到達しました`
    );
  } finally {
    if (browser) await browser.close();
    await viteServer.close();
  }
}

main().catch((err) => {
  console.error('[e2e] FAILED:', err);
  process.exitCode = 1;
});
