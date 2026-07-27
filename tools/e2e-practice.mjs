// アプリシェル (T005) を含めたスモーク E2E。
// 使い方: npm run e2e (事前に `npx playwright install chromium` が必要)
//
// vite の開発サーバーを (プログラム的に) 起動し、Chromium (headless) で
// タイトル画面 →「はじめる」→ もじえらび画面 →「1」を選択 → れんしゅう画面の
// デバッグフック `window.__kakijun.simulateStroke` で全画をなぞり終える →
// ごほうび画面に星が表示される、までの一連のフローを検証する。
//
// あわせて T008 (もどるボタン + 進捗リセット) のスモークとして、
// (a) れんしゅう中に「← もどる」を押すともじえらび画面へ戻れること
// (b) タイトル画面の設定 (⚙) → 確認モーダルで「けす」を押すと
//     localStorage の stars/stickers が空になり、muted 設定は保持されること
// も検証する。
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
const STORAGE_KEY = 'kakijun:v1';

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

/** れんしゅう画面で、なぞってね (trace) → じぶんで (solo) の順に全画を正しくなぞらせる */
async function driveToCompletion(page, medians, strokeCount) {
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

    // ミュートを ON にしておく (あとでリセット後も保持されることを確認するため)
    await page.click('.title-screen .mute-btn');
    const mutedAfterToggle = await page.evaluate(() => {
      const raw = window.localStorage.getItem('kakijun:v1');
      return raw ? JSON.parse(raw).muted : null;
    });
    if (mutedAfterToggle !== true) {
      throw new Error(`ミュートの切り替えが保存されませんでした: ${mutedAfterToggle}`);
    }
    console.log('[e2e] ミュートを ON にした (リセット後の保持確認用)');

    await page.click('.title-screen .title-start-btn');

    // ---- もじえらび画面: 「すうじ」タブがデフォルトで選ばれている想定で「1」を選ぶ ----
    const charSelector = `.select-screen .char-card[data-char="${TARGET_CHAR}"]`;
    await page.waitForSelector(charSelector);
    console.log('[e2e] もじえらび画面を表示');
    await page.click(charSelector);

    // ---- れんしゅう画面 (1回目): 「← もどる」でもじえらびに戻れることを確認する (T008) ----
    await page.waitForFunction(() => Boolean(window.__kakijun), undefined, { timeout: TIMEOUT_MS });
    const initialPhase = await page.evaluate(() => window.__kakijun.getPhase());
    console.log(`[e2e] 初期フェーズ: ${initialPhase}`);
    if (initialPhase !== 'watch') {
      throw new Error(`初期フェーズが watch ではありません: ${initialPhase}`);
    }

    const backBtnSelector = '.practice-screen .back-btn';
    await page.waitForSelector(backBtnSelector);
    await page.click(backBtnSelector);
    await page.waitForSelector(charSelector);
    console.log('[e2e] れんしゅう中に「← もどる」を押してもじえらび画面へ戻れた');

    // ---- れんしゅう画面 (2回目): trace フェーズのストローク判定アニメ (snapToReference) 中に
    // 「← もどる」を押しても例外なくもじえらびへ戻れることを確認する (T008 レビュー指摘の追加ケース) ----
    await page.click(charSelector);
    await page.waitForFunction(() => Boolean(window.__kakijun), undefined, { timeout: TIMEOUT_MS });
    const traceTestMountPhase = await page.evaluate(() => window.__kakijun.getPhase());
    if (traceTestMountPhase !== 'watch') {
      throw new Error(`trace 中断テストの再マウントで初期フェーズが watch ではありません: ${traceTestMountPhase}`);
    }
    // simulateStroke は watch フェーズ中なら自動で trace へスキップしたうえで1画目を正解判定させる。
    // 正解判定後の snapToReference (スナップ) アニメーション再生中に「← もどる」を押すケースを
    // 再現するため、await せず fire-and-forget で呼び出してからごく短時間だけ待つ。
    void page.evaluate((pts) => window.__kakijun.simulateStroke(pts), medians[0]);
    await page.waitForTimeout(40);
    await page.click(backBtnSelector);
    await page.waitForSelector(charSelector);
    // fire-and-forget にした simulateStroke の Promise が完走するまで待ってから
    // コンソールエラーが出ていないことを確認する (最終チェックは末尾でまとめて行う)
    await page.waitForTimeout(500);
    console.log('[e2e] trace フェーズのスナップアニメ中に「← もどる」を押してももじえらび画面へ戻れた');

    // ---- れんしゅう画面 (3回目): 今度は最後まで完走させる ----
    await page.click(charSelector);
    await page.waitForFunction(() => Boolean(window.__kakijun), undefined, { timeout: TIMEOUT_MS });
    const restartedPhase = await page.evaluate(() => window.__kakijun.getPhase());
    if (restartedPhase !== 'watch') {
      throw new Error(`もどった後の再開時、初期フェーズが watch ではありません: ${restartedPhase}`);
    }

    await driveToCompletion(page, medians, strokeCount);

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

    console.log(
      `[e2e] OK: タイトル→もじえらび→「${TARGET_CHAR}」の練習→ごほうび (星${starsNum}) まで到達しました`
    );

    // ---- 進捗リセット (T008): タイトル画面に戻り、設定 (⚙) →「けす」で記録が消え、muted は保持される ----
    // ページを再読み込みしてタイトル画面から始める (同一オリジンなので localStorage は保持される)
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('.title-screen .title-start-btn');
    console.log('[e2e] タイトル画面に再読み込みで戻った (localStorage は保持される想定)');

    const beforeReset = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, STORAGE_KEY);
    console.log(`[e2e] リセット前の記録: stars=${JSON.stringify(beforeReset?.stars)} muted=${beforeReset?.muted}`);
    if (!beforeReset || Object.keys(beforeReset.stars ?? {}).length === 0) {
      throw new Error('リセット前の時点で stars が空です (テストの前提が崩れています)');
    }
    if (beforeReset.muted !== true) {
      throw new Error(`リセット前の muted が想定と違います: ${beforeReset.muted}`);
    }

    await page.click('.title-screen .settings-btn');
    await page.waitForSelector('.reset-modal');
    console.log('[e2e] 設定 (⚙) → リセット確認モーダルを表示');
    await page.click('.reset-modal .reset-confirm-btn');

    // クリックハンドラ内で resetProgress() は同期的に呼ばれるため、直後に読んでよい
    const afterReset = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, STORAGE_KEY);
    console.log(`[e2e] リセット後の記録: stars=${JSON.stringify(afterReset?.stars)} stickers=${JSON.stringify(afterReset?.stickers)} muted=${afterReset?.muted}`);
    if (!afterReset || Object.keys(afterReset.stars ?? {}).length !== 0) {
      throw new Error(`リセット後も stars が空になっていません: ${JSON.stringify(afterReset?.stars)}`);
    }
    if ((afterReset.stickers ?? []).length !== 0) {
      throw new Error(`リセット後も stickers が空になっていません: ${JSON.stringify(afterReset.stickers)}`);
    }
    if (afterReset.muted !== true) {
      throw new Error(`リセット後に muted 設定が保持されていません: ${afterReset.muted}`);
    }

    // フィードバック表示 → モーダルが自動で閉じることも確認する
    await page.waitForSelector('.reset-modal', { state: 'detached', timeout: TIMEOUT_MS });
    console.log('[e2e] OK: リセット後 stars/stickers が空になり、muted は保持され、モーダルが自動で閉じた');

    if (consoleErrors.length > 0) {
      throw new Error(`ブラウザ側でエラーが発生しました:\n${consoleErrors.join('\n')}`);
    }
  } finally {
    if (browser) await browser.close();
    await viteServer.close();
  }
}

main().catch((err) => {
  console.error('[e2e] FAILED:', err);
  process.exitCode = 1;
});
