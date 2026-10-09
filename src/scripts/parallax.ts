// Progressive enhancement: original photo first, optional layers on mouse input.
const frame = document.querySelector<HTMLElement>('.image-window')!;
const photo = document.querySelector<HTMLElement>('.photo-layer')!;
const original = photo.querySelector<HTMLImageElement>('#scene')!;
const planes = Array.from(frame.querySelectorAll<HTMLElement>('[data-parallax-depth]'));
const layerPictures = Array.from(frame.querySelectorAll<HTMLPictureElement>('[data-layer-picture]'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const depths = planes.map(plane => Number(plane.dataset.parallaxDepth) || 0);
let zoomScale = 1;
let currentX = 0;
let currentY = 0;
let velocityX = 0;
let velocityY = 0;
let targetX = 0;
let targetY = 0;
let animation = 0;
let lastTime = 0;
let visible = true;
let ready = false;
let loading: Promise<void> | undefined;
let previousActive = false;
let bounds = frame.getBoundingClientRect();
const previous = planes.map(() => '');

function eligible() {
  return visible && !document.hidden && !reduced.matches && finePointer.matches && zoomScale < 2;
}
function enabled() { return ready && eligible(); }

function render() {
  const active = enabled();
  if (active !== previousActive) {
    photo.classList.toggle('layers-active', active);
    previousActive = active;
  }
  // Return to the high-resolution original before the cable becomes enlarged.
  const strength = Math.max(0, 2 - zoomScale) ** 2;
  // Shift subjects by depth over the stationary ground, without rotating planes.
  // Cached bounds limit travel on smaller windows without per-frame layout reads.
  const viewportScale = Math.min(1, bounds.width / 1000, bounds.height / 600);
  const motionStrength = strength * viewportScale;
  for (let i = 0; i < planes.length; i++) {
    const x = -currentX * depths[i] * 60 * motionStrength;
    const y = -currentY * depths[i] * 18 * motionStrength;
    const transform = active && depths[i] > 0
      ? `translate3d(${x}px, ${y}px, 0)`
      : 'none';
    if (previous[i] !== transform) {
      planes[i].style.transform = transform;
      previous[i] = transform;
    }
  }
}

async function loadLayers() {
  if (ready || loading || !eligible()) return loading;
  loading = (async () => {
    try {
      await Promise.all(layerPictures.map(async picture => {
        for (const source of picture.querySelectorAll('source')) {
          source.srcset = source.dataset.srcset!;
        }
        const image = picture.querySelector('img')!;
        image.src = image.dataset.src!;
        // Activate atomically; failed assets leave the original photograph intact.
        await image.decode();
      }));
      // Reuse the browser-selected original beneath the moving planes to fill
      // exposed outer edges, without changing scale as the pointer settles.
      photo.style.backgroundImage = `url(${JSON.stringify(original.currentSrc || original.src)})`;
      ready = true;
      render();
      start();
    } catch {
      ready = false;
      render();
    }
  })();
  return loading;
}

function tick(time: number) {
  const delta = Math.min(lastTime ? time - lastTime : 16, 32);
  lastTime = time;
  const steps = Math.ceil(delta / 8);
  const dt = delta / steps / 1000;
  for (let step = 0; step < steps; step++) {
    // Critical damping follows smoothly without a rubber-like overshoot.
    velocityX += ((targetX - currentX) * 100 - velocityX * 20) * dt;
    velocityY += ((targetY - currentY) * 100 - velocityY * 20) * dt;
    currentX += velocityX * dt;
    currentY += velocityY * dt;
  }
  const settled = Math.abs(targetX - currentX) + Math.abs(targetY - currentY)
    + Math.abs(velocityX) + Math.abs(velocityY) < 0.001;
  if (settled) { currentX = targetX; currentY = targetY; velocityX = velocityY = 0; }
  render();
  if (!settled && enabled()) animation = requestAnimationFrame(tick);
  else {
    animation = 0;
    lastTime = 0;
    for (const plane of planes) plane.style.willChange = 'auto';
  }
}

function start() {
  if (!enabled() || animation) return;
  for (let i = 0; i < planes.length; i++) {
    if (depths[i] > 0) planes[i].style.willChange = 'transform';
  }
  animation = requestAnimationFrame(tick);
}

function reset() {
  targetX = targetY = 0;
  if (enabled()) start();
  else {
    cancelAnimationFrame(animation);
    animation = 0;
    lastTime = 0;
    currentX = currentY = velocityX = velocityY = 0;
    for (const plane of planes) plane.style.willChange = 'auto';
    render();
  }
}

frame.addEventListener('pointerenter', event => {
  bounds = frame.getBoundingClientRect();
  if (event.pointerType === 'mouse') void loadLayers();
});
frame.addEventListener('pointermove', event => {
  if (!eligible() || event.pointerType !== 'mouse') return;
  targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
  targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
  void loadLayers();
  start();
}, { passive: true });
frame.addEventListener('pointerleave', reset);
addEventListener('blur', reset);
document.addEventListener('visibilitychange', reset);
reduced.addEventListener('change', reset);
finePointer.addEventListener('change', reset);
new ResizeObserver(() => { bounds = frame.getBoundingClientRect(); render(); }).observe(frame);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; reset(); }).observe(frame);

export function updateParallaxZoom(scale: number) {
  if (scale === zoomScale) return;
  zoomScale = scale;
  if (!eligible()) reset();
  else render();
}
render();
