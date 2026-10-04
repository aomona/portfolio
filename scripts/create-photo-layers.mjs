// Derive cropped parallax layers from the original; no generative reconstruction.
// Usage: node scripts/create-photo-layers.mjs assets/photo-person-mask.png
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const maskPath = process.argv[2];
if (!maskPath) throw new Error('Pass the approved person mask PNG path.');
const original = 'public/images/FP002119.JPG';
const width = 6000, height = 3376;
const layout = JSON.parse(await readFile('assets/photo-layer-layout.json', 'utf8'));
const architecture = JSON.parse(await readFile('assets/photo-architecture-masks.json', 'utf8'));
const crop = layout.planes.find(plane => plane.name === 'person');
const metadata = await sharp(original).metadata();
if (metadata.width !== width || metadata.height !== height) throw new Error('Unexpected original dimensions');
const { data: alpha, info } = await sharp(maskPath).greyscale().raw().toBuffer({ resolveWithObject: true });
if (info.width !== crop.width || info.height !== crop.height) throw new Error('Unexpected mask dimensions');
const rgb = await sharp(original).removeAlpha().raw().toBuffer();
const person = Buffer.alloc(crop.width * crop.height * 4);
const patch = Buffer.alloc(person.length);

// Fill only the hidden silhouette from adjacent pixels on the same scanline.
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
    const offset = (y * crop.width + x) * 4;
    const sourceOffset = ((y + crop.y) * width + x + crop.x) * 3;
    for (let c = 0; c < 3; c++) person[offset + c] = rgb[sourceOffset + c];
    person[offset + 3] = opacity;
  }
  for (const run of runs) {
    const left = Math.max(0, run[0] - 4), right = Math.min(crop.width - 1, run[1] + 4);
    for (let x = left; x <= right; x++) {
      const mix = (x - left) / Math.max(1, right - left);
      const offset = (y * crop.width + x) * 4;
      const textureOffset = Math.min(32, Math.min(x - left, right - x));
      const l = ((y + crop.y) * width + crop.x + left - 8 - textureOffset) * 3;
      const r = ((y + crop.y) * width + crop.x + right + 8 + textureOffset) * 3;
      for (let c = 0; c < 3; c++) patch[offset + c] = Math.round(rgb[l + c] * (1 - mix) + rgb[r + c] * mix);
      patch[offset + 3] = Math.round(255 * Math.min(1, (x - left) / 3, (right - x) / 3));
    }
  }
}
await mkdir('public/images', { recursive: true });
async function saveLayer(name, data, region) {
  const pipeline = sharp(data, { raw: { width: region.width, height: region.height, channels: 4 } })
    .resize(region.outputWidth, region.outputHeight);
  const encoding = name === 'person' || name.endsWith('patch')
    ? { lossless: true, effort: 6 }
    : { quality: 92, alphaQuality: 100, effort: 6 };
  await pipeline.clone().webp(encoding).toFile(`public/images/FP002119-${name}.webp`);
  await pipeline.clone().png({ compressionLevel: 9 }).toFile(`public/images/FP002119-${name}.png`);
}
await saveLayer('person', person, crop);
await saveLayer('background-patch', patch, crop);

// Ground comes from the photo with the original person removed, preventing ghosts.
const clean = Buffer.from(rgb);
for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
  const p = (y * crop.width + x) * 4;
  const opacity = patch[p + 3] / 255;
  if (!opacity) continue;
  const target = ((y + crop.y) * width + x + crop.x) * 3;
  for (let c = 0; c < 3; c++) clean[target + c] = Math.round(patch[p + c] * opacity + rgb[target + c] * (1 - opacity));
}
for (const region of layout.planes.filter(plane => plane.name.startsWith('warehouse-'))) {
  // Include a band of original sky around rooflines and thin antennae. This
  // removes stationary fringes; the feather lands in smooth sky, not on bricks.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="3376" viewBox="0 0 1200 675.2"><polygon fill="white" stroke="white" stroke-width="24" stroke-linejoin="round" points="${architecture[region.name]}"/></svg>`;
  const mask = await sharp(Buffer.from(svg)).extract({ left: region.x, top: region.y, width: region.width, height: region.height })
    .ensureAlpha().extractChannel(3).blur(6).raw().toBuffer();
  const wall = Buffer.alloc(region.width * region.height * 4);
  const skyPatch = Buffer.alloc(wall.length);
  const leftWall = region.name.endsWith('left');
  for (let y = 0; y < region.height; y++) {
    let boundary = leftWall ? -1 : region.width;
    for (let x = 0; x < region.width; x++) if (mask[y * region.width + x] > 8) {
      boundary = leftWall ? Math.max(boundary, x) : Math.min(boundary, x);
    }
    if (boundary < 0 || boundary === region.width) continue;
    const sampleX = Math.max(0, Math.min(width - 1, region.x + boundary + (leftWall ? 30 : -30)));
    const sample = ((y + region.y) * width + sampleX) * 3;
    for (let x = 0; x < region.width; x++) {
      const opacity = mask[y * region.width + x];
      if (!opacity) continue;
      const p = (y * region.width + x) * 4;
      const source = ((y + region.y) * width + x + region.x) * 3;
      for (let c = 0; c < 3; c++) {
        wall[p + c] = rgb[source + c];
        skyPatch[p + c] = rgb[sample + c];
      }
      wall[p + 3] = opacity;
      // Keep original blue/white sky around the cutout, rather than painting a
      // constant-color halo there. Dark rooflines still get fully removed.
      const skyLike = rgb[source + 1] > 160 && rgb[source + 2] > 175 && rgb[source + 2] - rgb[source] > 5;
      skyPatch[p + 3] = skyLike ? 0 : opacity;
    }
  }
  await saveLayer(region.name, wall, region);
  await saveLayer(`${region.name}-patch`, skyPatch, region);
}
const ground = layout.planes.find(plane => plane.name === 'ground');
const pavement = Buffer.alloc(ground.width * ground.height * 4);
for (let y = 0; y < ground.height; y++) for (let x = 0; x < ground.width; x++) {
  const p = (y * ground.width + x) * 4;
  const source = ((y + ground.y) * width + x + ground.x) * 3;
  for (let c = 0; c < 3; c++) pavement[p + c] = clean[source + c];
  const blend = Math.min(1, y / 100);
  pavement[p + 3] = Math.round(255 * blend * blend * (3 - 2 * blend));
}
await saveLayer('ground', pavement, ground);
console.log('Created five cropped scene planes; person and patches remain lossless.');
