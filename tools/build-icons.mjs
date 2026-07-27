// tools/icon.svg から PWA 用アイコン各種を生成する。
// 使い方: npm run icons
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcSvgPath = path.join(root, 'tools', 'icon.svg');
const publicDir = path.join(root, 'public');

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon.png', size: 32 },
];

async function main() {
  const svg = await readFile(srcSvgPath);

  for (const { file, size } of targets) {
    const outPath = path.join(publicDir, file);
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`generated: ${path.relative(root, outPath)} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
