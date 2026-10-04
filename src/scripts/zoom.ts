export {};

const journey = document.querySelector<HTMLElement>('.journey')!;
const stage = document.querySelector<HTMLElement>('.stage')!;
const frame = document.querySelector<HTMLElement>('.image-window')!;
const layer = document.querySelector<HTMLElement>('.photo-layer')!;
const image = document.querySelector<HTMLImageElement>('#scene')!;
const progress = document.querySelector<HTMLElement>('.progress')!;
const number = document.querySelector<HTMLElement>('.progress-number')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// The hanging white cable in the supplied 1182 × 665 photograph.
const focus = { x: 0.474, y: 0.722 };
let current = 0;
let target = 0;
let animation = 0;
let lastTime = 0;
let frameWidth = 0;
let frameHeight = 0;
let focusX = 0;
let focusY = 0;

function measure() {
  frameWidth = frame.clientWidth;
  frameHeight = frame.clientHeight;
  const sourceWidth = image.naturalWidth || 1182;
  const sourceHeight = image.naturalHeight || 665;
  const cover = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
  focusX = (frameWidth - sourceWidth * cover) / 2 + sourceWidth * cover * focus.x;
  focusY = (frameHeight - sourceHeight * cover) / 2 + sourceHeight * cover * focus.y;
  updateTarget();
  render();
}

function render() {
  // A gentle acceleration and deceleration, with exponential zoom for even perceived speed.
  const eased = current * current * (3 - 2 * current);
  const scale = reducedMotion.matches ? 1 : Math.exp(Math.log(9) * eased);
  const x = (frameWidth / 2 - focusX) * scale * eased;
  const y = (frameHeight / 2 - focusY) * scale * eased;
  layer.style.transform = `translate3d(${reducedMotion.matches ? 0 : x}px, ${reducedMotion.matches ? 0 : y}px, 0) scale(${scale})`;
  stage.style.setProperty('--zoom-progress', String(current));
  const value = Math.round(current * 100);
  number.textContent = String(value).padStart(2, '0');
  progress.setAttribute('aria-valuenow', String(value));
}

function tick(time: number) {
  const delta = lastTime ? Math.min(time - lastTime, 64) : 16;
  lastTime = time;
  // Time-based damping is consistent on 60 Hz and 120 Hz displays.
  current += (target - current) * (1 - Math.exp(-delta / 135));
  if (Math.abs(target - current) < 0.0001) current = target;
  render();
  if (current !== target) animation = requestAnimationFrame(tick);
  else { animation = 0; lastTime = 0; }
}

function updateTarget() {
  const distance = Math.max(1, journey.offsetHeight - stage.offsetHeight);
  target = Math.max(0, Math.min(1, -journey.getBoundingClientRect().top / distance));
  if (reducedMotion.matches) { current = target; render(); }
  else if (!animation) animation = requestAnimationFrame(tick);
}

addEventListener('scroll', updateTarget, { passive: true });
addEventListener('pageshow', measure);
image.addEventListener('load', measure);
new ResizeObserver(measure).observe(frame);
reducedMotion.addEventListener('change', measure);
measure();
