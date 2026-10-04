// Rebuild lightweight parallax overlays without changing the original RGB.
// Usage: node scripts/create-photo-layers.mjs assets/photo-person-mask.png
// The 800 × 1900 grayscale mask covers the crop at x=2700, y=1300.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const maskPath = process.argv[2];
if (!maskPath) throw new Error('Pass the approved person mask PNG path.');
const original = 'public/images/FP002119.JPG';
const width = 6000, height = 3376;
const crop = { left: 2700, top: 1300, width: 800, height: 1900 };
const metadata = await sharp(original).metadata();
if (metadata.width !== width || metadata.height !== height) throw new Error('Unexpected original dimensions');
const { data: alpha, info: maskInfo } = await sharp(maskPath).greyscale().raw().toBuffer({ resolveWithObject: true });
if (maskInfo.width !== crop.width || maskInfo.height !== crop.height) throw new Error('Unexpected mask dimensions');
const rgb = await sharp(original).removeAlpha().raw().toBuffer();
const person = Buffer.alloc(width * height * 4);
const patch = Buffer.alloc(width * height * 4);
// Fill the hidden silhouette from neighboring pixels on the same scanline.
// This is a small-travel parallax patch, not a synthesized replacement scene.
for (let y = 0; y < crop.height; y++) {
  const runs = [];
  let runStart = -1;
  for (let x = 0; x < crop.width; x++) {
    const opacity = alpha[y * crop.width + x];
    if (opacity >= 8 && runStart < 0) runStart = x;
    if (runStart >= 0 && (opacity < 8 || x === crop.width - 1)) {
      const end = opacity < 8 ? x - 1 : x;
      const previous = runs.at(-1);
      if (previous && runStart - previous[1] < 9) previous[1] = end;
      else runs.push([runStart, end]);
      runStart = -1;
    }
    if (!opacity) continue;
    const offset = ((y + crop.top) * width + x + crop.left) * 4;
    const sourceOffset = ((y + crop.top) * width + x + crop.left) * 3;
    person[offset] = rgb[sourceOffset];
    person[offset + 1] = rgb[sourceOffset + 1];
    person[offset + 2] = rgb[sourceOffset + 2];
    person[offset + 3] = opacity;
  }
  for (const run of runs) {
  // A 3px feather cleans the original fringe without a wide visible halo.
  const left = Math.max(0, run[0] - 4), right = Math.min(crop.width - 1, run[1] + 4);
  for (let x = left; x <= right; x++) {
    const mix = (x - left) / Math.max(1, right - left);
    const offset = ((y + crop.top) * width + x + crop.left) * 4;
    const textureOffset = Math.min(32, Math.min(x - left, right - x));
    const l = ((y + crop.top) * width + crop.left + left - 8 - textureOffset) * 3;
    const r = ((y + crop.top) * width + crop.left + right + 8 + textureOffset) * 3;
    for (let c = 0; c < 3; c++) patch[offset + c] = Math.round(rgb[l + c] * (1 - mix) + rgb[r + c] * mix);
    patch[offset + 3] = Math.round(255 * Math.min(1, (x - left) / 3, (right - x) / 3));
  }
  }
}
await mkdir('public/images', { recursive: true });
for (const [name, data] of [['person', person], ['background-patch', patch]]) {
  const pipeline = sharp(data, { raw: { width, height, channels: 4 } });
  await pipeline.clone().webp({ lossless: true, effort: 6 }).toFile(`public/images/FP002119-${name}.webp`);
  await pipeline.clone().png({ compressionLevel: 9 }).toFile(`public/images/FP002119-${name}.png`);
}
console.log('Original RGB preserved; generated lossless WebP and PNG overlays.');
