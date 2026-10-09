// Derive four semantic scene groups from approved masks and original photo RGB.
// Usage: node scripts/create-photo-layers.mjs assets/photo-person-mask.png
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const personMaskPath = process.argv[2] || 'assets/photo-person-mask.png';
const width = 6000, height = 3376;
const original = 'public/images/FP002119.JPG';
const layout = JSON.parse(await readFile('assets/photo-layer-layout.json', 'utf8'));
const metadata = await sharp(original).metadata();
if (metadata.width !== width || metadata.height !== height) throw new Error('Unexpected original dimensions');
const rgb = await sharp(original).removeAlpha().raw().toBuffer();
const fill = await sharp('assets/photo-background-fill.webp').resize(width, height).removeAlpha().raw().toBuffer();
const wallsFill = await sharp('assets/photo-buildings-fill.webp').resize(width, height).removeAlpha().raw().toBuffer();
const crowdPart = layout.parts.find(part => part.name === 'crowds');
const crowdAlpha = await sharp('assets/photo-crowds-mask.png').greyscale().dilate(5).raw().toBuffer();
await mkdir('public/images', { recursive: true });

async function saveLayer(name, data, region, lossless) {
  const pipeline = sharp(data, { raw: { width: region.width, height: region.height, channels: 4 } })
    .resize(region.outputWidth, region.outputHeight);
  const encoding = lossless ? { lossless: true, effort: 6 } : { quality: 92, alphaQuality: 100, effort: 6 };
  await pipeline.clone().webp(encoding).toFile(`public/images/FP002119-${name}.webp`);
  await pipeline.clone().png({ compressionLevel: 9 }).toFile(`public/images/FP002119-${name}.png`);
}

for (const part of layout.parts) {
  const path = part.name === 'person' ? personMaskPath : `assets/photo-${part.name}-mask.png`;
  const { data: alpha, info } = await sharp(path).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== part.width || info.height !== part.height) throw new Error(`Unexpected ${part.name} mask dimensions`);
  const foreground = Buffer.alloc(part.width * part.height * 4);
  const patch = Buffer.alloc(foreground.length);
  for (let y = 0; y < part.height; y++) for (let x = 0; x < part.width; x++) {
    const index = y * part.width + x;
    const source = ((y + part.y) * width + x + part.x) * 3;
    const p = index * 4;
    const opacity = alpha[index];
    if (opacity) {
      const gx = x + part.x, gy = y + part.y;
      const crowdIndex = (gy - crowdPart.y) * crowdPart.width + gx - crowdPart.x;
      const behindCrowd = part.group === 'buildings' && gy >= crowdPart.y && gy < crowdPart.y + crowdPart.height
        && gx >= crowdPart.x && gx < crowdPart.x + crowdPart.width && crowdAlpha[crowdIndex] > 0;
      const sourceRGB = behindCrowd ? wallsFill : rgb;
      const edgeBackground = part.name === 'crowds' ? wallsFill : fill;
      for (let c = 0; c < 3; c++) {
        // Remove the original background color from partially covered edge
        // pixels. Fully opaque subject pixels keep the original RGB exactly.
        const value = opacity === 255 ? sourceRGB[source + c]
          : (sourceRGB[source + c] * 255 - edgeBackground[source + c] * (255 - opacity)) / opacity;
        foreground[p + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
      foreground[p + 3] = opacity;
    }
    // Cover only a two-source-pixel fringe. No broad sky band around rooflines.
    let patchAlpha = opacity;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < part.width && ny >= 0 && ny < part.height) {
        patchAlpha = Math.max(patchAlpha, alpha[ny * part.width + nx]);
      }
    }
    if (patchAlpha) {
      for (let c = 0; c < 3; c++) patch[p + c] = fill[source + c];
      patch[p + 3] = patchAlpha;
    }
  }
  await saveLayer(part.name, foreground, part, part.name === 'person');
  await saveLayer(`${part.name}-patch`, patch, part, true);
}
console.log('Created background / buildings / crowds / person groups from refined masks.');
