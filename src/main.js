import { attachLiquidGlassRefraction } from './refraction.js';

const square = document.getElementById('square');

const refraction = attachLiquidGlassRefraction(square, {
  scale: 48,
  aberration: 8,
  mode: 'diagonal',
});

// --- Drag ---
let dragging = false;
let offsetX = 0;
let offsetY = 0;

square.addEventListener('pointerdown', (e) => {
  dragging = true;
  square.setPointerCapture(e.pointerId);
  const rect = square.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
});

square.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  square.style.left = `${e.clientX - offsetX}px`;
  square.style.top = `${e.clientY - offsetY}px`;
});

square.addEventListener('pointerup', () => {
  dragging = false;
});

// --- Tint ---
// --glass-tint-alpha is consumed directly by the `liquid-glass` utility's
// `background: rgb(var(--glass-tint) / var(--glass-tint-alpha))` (see
// src/style.css): overriding it here changes opacity without touching the
// tint color, and without the nested-var() trap documented in the skill's
// "Runtime theming" section.
const tintInput = document.getElementById('tint');
const tintVal = document.getElementById('tintVal');
tintInput.addEventListener('input', () => {
  const pct = tintInput.value;
  square.style.setProperty('--glass-tint-alpha', `${pct}%`);
  tintVal.textContent = `${pct}%`;
});

// --- Controls ---
// refraction is null when the browser doesn't support backdrop-filter:
// url() or the user opted out via prefers-reduced-transparency/-contrast;
// the CSS fallback from the `liquid-glass` utility is already in effect,
// so the tuning controls simply have nothing to drive.
if (refraction) {
  const scaleInput = document.getElementById('scale');
  const caInput = document.getElementById('ca');
  const lensInput = document.getElementById('lens');
  const scaleVal = document.getElementById('scaleVal');
  const caVal = document.getElementById('caVal');

  const apply = () => {
    const scale = Number(scaleInput.value);
    const aberration = Number(caInput.value);
    refraction.update({ scale, aberration, mode: lensInput.value });
    scaleVal.textContent = scale;
    caVal.textContent = aberration;
  };

  scaleInput.addEventListener('input', apply);
  caInput.addEventListener('input', apply);
  lensInput.addEventListener('input', apply);

  // --- Blur ---
  // --glass-blur-refract is read live by refraction.js's inline
  // backdrop-filter (`blur(var(--glass-blur-refract, 3px))`): no need to
  // call refraction.update(), the browser re-resolves the var() on its own
  // as soon as the custom property changes on this element.
  const blurInput = document.getElementById('blur');
  const blurVal = document.getElementById('blurVal');
  blurInput.addEventListener('input', () => {
    const px = blurInput.value;
    square.style.setProperty('--glass-blur-refract', `${px}px`);
    blurVal.textContent = `${px}px`;
  });
}
