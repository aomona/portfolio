"""Rebuild the hidden fill from approved masks; no generative model or RGB edits to subjects.
Optional authoring dependency: opencv-python-headless, numpy, Pillow.
Run from the repository root, then run scripts/create-photo-layers.mjs.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
layout = json.loads((root / 'assets/photo-layer-layout.json').read_text())
original = np.array(Image.open(root / 'public/images/FP002119.JPG').convert('RGB'))
missing = np.zeros(original.shape[:2], np.uint8)
crowd_missing = np.zeros_like(missing)
for part in layout['parts']:
    alpha = np.array(Image.open(root / f"assets/photo-{part['name']}-mask.png").convert('L'))
    if alpha.shape != (part['height'], part['width']):
        raise ValueError('Unexpected mask size')
    region = missing[part['y']:part['y'] + part['height'], part['x']:part['x'] + part['width']]
    np.maximum(region, alpha, out=region)
    if part['name'] == 'crowds':
        crowd_missing[part['y']:part['y'] + part['height'], part['x']:part['x'] + part['width']] = alpha
# Only this concealed fill is generated at half resolution. Foreground RGB comes
# directly from the original; the normal static/zoom photo remains untouched.
small = cv2.resize(original, (3000, 1688), interpolation=cv2.INTER_AREA)
mask = cv2.resize(missing, (3000, 1688), interpolation=cv2.INTER_AREA)
mask = cv2.dilate((mask > 4).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
fill = cv2.inpaint(small, mask, 3, cv2.INPAINT_TELEA)
Image.fromarray(fill).save(root / 'assets/photo-background-fill.webp', lossless=True, method=6)
# Architecture keeps its surface behind people; use a separate plate that
# removes pedestrians without removing the walls behind them.
crowd_mask = cv2.resize(crowd_missing, (3000, 1688), interpolation=cv2.INTER_AREA)
crowd_mask = cv2.dilate((crowd_mask > 4).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
walls = cv2.inpaint(small, crowd_mask, 3, cv2.INPAINT_TELEA)
Image.fromarray(walls).save(root / 'assets/photo-buildings-fill.webp', lossless=True, method=6)
print('Prepared non-generative hidden fill from adjacent photo pixels.', flush=True)
