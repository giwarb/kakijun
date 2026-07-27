// KanjiVG (https://github.com/KanjiVG/kanjivg, CC BY-SA 3.0, © Ulrich Apel) から
// ひらがな46字 + 数字0-9 の書き順データを取得し、src/data/strokes.json を生成する。
// 使い方: npm run data
//
// - SVG は tools/kanjivg-cache/<hex>.svg にキャッシュする。キャッシュがあればネットワークアクセスしない。
// - 各ストロークの `d` (パス) をそのまま保持しつつ、svg-path-properties で等間隔32点にサンプリングした
//   中心線 (median) を判定用データとして生成する。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { svgPathProperties } from 'svg-path-properties';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cacheDir = path.join(root, 'tools', 'kanjivg-cache');
const outPath = path.join(root, 'src', 'data', 'strokes.json');

const VIEW_BOX = 109;
const SAMPLE_POINTS = 32;
const KANJIVG_BASE_URL = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

const DIGITS = '0123456789';
const HIRAGANA =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
const CHARS = [...DIGITS, ...HIRAGANA];

function toHex(ch) {
  return ch.codePointAt(0).toString(16).padStart(5, '0');
}

async function ensureCacheDir() {
  await mkdir(cacheDir, { recursive: true });
}

async function loadSvg(ch) {
  const hex = toHex(ch);
  const cachePath = path.join(cacheDir, `${hex}.svg`);

  if (existsSync(cachePath)) {
    return readFile(cachePath, 'utf-8');
  }

  const url = `${KANJIVG_BASE_URL}${hex}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const svg = await res.text();
  await writeFile(cachePath, svg, 'utf-8');
  console.log(`downloaded: ${hex}.svg (${ch})`);
  return svg;
}

// KanjiVG の SVG から <g id="kvg:StrokePaths_...">...</g> 内の <path d="..."> を
// 文書順に抽出する。StrokeNumbers グループの <text> は別グループなので対象に含まれない。
function extractStrokeDs(svg) {
  const strokePathsMatch = svg.match(
    /<g id="kvg:StrokePaths_[^"]*"[^>]*>([\s\S]*?)<g id="kvg:StrokeNumbers_/
  );
  if (!strokePathsMatch) {
    throw new Error('StrokePaths group not found in SVG');
  }
  const strokePathsSection = strokePathsMatch[1];

  const ds = [];
  const pathRe = /<path\b[^>]*\bd="([^"]*)"/g;
  let match;
  while ((match = pathRe.exec(strokePathsSection)) !== null) {
    ds.push(match[1]);
  }
  if (ds.length === 0) {
    throw new Error('no <path> elements found in StrokePaths group');
  }
  return ds;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// パスを等間隔 SAMPLE_POINTS 点にサンプリングする ([x, y] の配列、小数1桁に丸め)
function sampleMedian(d) {
  const props = new svgPathProperties(d);
  const totalLength = props.getTotalLength();
  const points = [];
  for (let i = 0; i < SAMPLE_POINTS; i++) {
    const at = (totalLength * i) / (SAMPLE_POINTS - 1);
    const { x, y } = props.getPointAtLength(at);
    points.push([round1(x), round1(y)]);
  }
  return points;
}

async function buildChar(ch) {
  const svg = await loadSvg(ch);
  const ds = extractStrokeDs(svg);
  const medians = ds.map(sampleMedian);
  return { strokes: ds, medians };
}

async function main() {
  await ensureCacheDir();

  const chars = {};
  for (const ch of CHARS) {
    chars[ch] = await buildChar(ch);
  }

  const data = {
    version: 1,
    source: 'KanjiVG (CC BY-SA 3.0)',
    viewBox: VIEW_BOX,
    chars,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`generated: ${path.relative(root, outPath)} (${CHARS.length} chars)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
