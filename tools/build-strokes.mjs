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

function round2(n) {
  return Math.round(n * 100) / 100;
}

// 文字別の「ストローク反転」補正。文字 -> 反転するストロークのインデックス配列。
// KanjiVG 由来の書き順が日本の一般的な書き方と逆になっているケースをここで補正する。
const REVERSE_STROKES = { '8': [0] };

// KanjiVG 形式のパス `d` (M + cubic (`c`/`C`) の連続) を絶対座標の
// cubic セグメント列 [{ p0, c1, c2, p3 }, ...] にパースする。
function parsePathSegments(d) {
  const tokens = d.match(/[MmCc]|-?\d*\.?\d+/g);
  if (!tokens) {
    throw new Error(`cannot parse path: ${d}`);
  }
  let i = 0;
  function readNum() {
    const t = tokens[i];
    if (t === undefined || /[A-Za-z]/.test(t)) {
      throw new Error(`expected number in path: ${d}`);
    }
    i += 1;
    return parseFloat(t);
  }

  const cmd0 = tokens[i++];
  if (cmd0 !== 'M') {
    throw new Error(`unsupported path command (expected M first): ${cmd0} in ${d}`);
  }
  let x = readNum();
  let y = readNum();
  const start = [x, y];

  const segments = [];
  let curCmd = null;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'c' || t === 'C') {
      curCmd = t;
      i += 1;
      continue;
    }
    if (/[A-Za-z]/.test(t)) {
      throw new Error(`unsupported path command: ${t} in ${d}`);
    }
    if (curCmd !== 'c' && curCmd !== 'C') {
      throw new Error(`unexpected coordinates without a command in path: ${d}`);
    }
    const x1 = readNum();
    const y1 = readNum();
    const x2 = readNum();
    const y2 = readNum();
    const x3 = readNum();
    const y3 = readNum();
    const p0 = [x, y];
    let c1;
    let c2;
    let p3;
    if (curCmd === 'c') {
      c1 = [x + x1, y + y1];
      c2 = [x + x2, y + y2];
      p3 = [x + x3, y + y3];
    } else {
      c1 = [x1, y1];
      c2 = [x2, y2];
      p3 = [x3, y3];
    }
    segments.push({ p0, c1, c2, p3 });
    x = p3[0];
    y = p3[1];
  }
  return { start, segments };
}

// パス `d` を逆走パスに変換する(形状は保存し進行方向だけ反転する)。
// M x,y の後に cubic (`c`/`C`) が連続する KanjiVG 形式のみサポートする。
function reversePathD(d) {
  const { segments } = parsePathSegments(d);
  if (segments.length === 0) {
    throw new Error(`no cubic segments to reverse: ${d}`);
  }

  const last = segments[segments.length - 1];
  let out = `M${round2(last.p3[0])},${round2(last.p3[1])}`;
  for (let k = segments.length - 1; k >= 0; k -= 1) {
    const { p0, c1, c2 } = segments[k];
    out += `C${round2(c2[0])},${round2(c2[1])} ${round2(c1[0])},${round2(c1[1])} ${round2(p0[0])},${round2(p0[1])}`;
  }
  return out;
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
  const rawDs = extractStrokeDs(svg);
  const reverseIndices = REVERSE_STROKES[ch];
  const ds = reverseIndices
    ? rawDs.map((d, i) => (reverseIndices.includes(i) ? reversePathD(d) : d))
    : rawDs;
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
