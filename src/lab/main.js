// Liquid Glass Lab — wiring.
//
// Every control here maps 1:1 to a CSS custom property or refraction option
// defined by the `apple-design` skill's references/web-liquid-glass.md and
// references/web-liquid-glass-refraction.md. No control exists for a value
// the skill doesn't define as configurable.
//
// All CSS-variable controls write to `document.documentElement` (the
// "globally" tier of the skill's Runtime theming rule): every [data-glass]
// element on the page reconfigures at once, with no re-render and no
// framework, because each knob is consumed directly by var() in the
// utility's own declarations (never nested inside another custom property).

import { attachRefraction, isRefractionSupported } from './refraction.js';

const root = document.documentElement;
const glassEls = () => document.querySelectorAll('[data-glass]');

function hexToTriplet(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function tripletToHex(triplet) {
  const [r, g, b] = triplet.trim().split(/\s+/).map(Number);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function setVar(name, value) {
  root.style.setProperty(name, value);
}

// ---------------------------------------------------------------------------
// Material tokens: blur, saturate, brightness, radius, rim opacity
// ---------------------------------------------------------------------------

const blurRange = document.getElementById('blurRange');
const blurVal = document.getElementById('blurVal');
blurRange.addEventListener('input', () => {
  setVar('--blur-glass', `${blurRange.value}px`);
  blurVal.textContent = `${blurRange.value}px`;
});

const saturateRange = document.getElementById('saturateRange');
const saturateVal = document.getElementById('saturateVal');
saturateRange.addEventListener('input', () => {
  setVar('--glass-saturate', `${saturateRange.value}%`);
  saturateVal.textContent = `${saturateRange.value}%`;
});

const brightnessRange = document.getElementById('brightnessRange');
const brightnessVal = document.getElementById('brightnessVal');
brightnessRange.addEventListener('input', () => {
  setVar('--glass-brightness', brightnessRange.value);
  brightnessVal.textContent = Number(brightnessRange.value).toFixed(2);
});

const radiusRange = document.getElementById('radiusRange');
const radiusVal = document.getElementById('radiusVal');
radiusRange.addEventListener('input', () => {
  setVar('--radius-glass', `${radiusRange.value}px`);
  radiusVal.textContent = `${radiusRange.value}px`;
});

const rimRange = document.getElementById('rimRange');
const rimVal = document.getElementById('rimVal');
rimRange.addEventListener('input', () => {
  // Set the whole token directly (never nest a var() inside it) — see the
  // "Runtime theming" rule in web-liquid-glass.md.
  setVar('--color-glass-rim', `rgb(255 255 255 / ${rimRange.value}%)`);
  rimVal.textContent = `${rimRange.value}%`;
});

// ---------------------------------------------------------------------------
// Tint: light and dark
// ---------------------------------------------------------------------------

const tintLightColor = document.getElementById('tintLightColor');
const tintLightAlpha = document.getElementById('tintLightAlpha');
const tintLightAlphaVal = document.getElementById('tintLightAlphaVal');
tintLightColor.addEventListener('input', () => setVar('--glass-tint', hexToTriplet(tintLightColor.value)));
tintLightAlpha.addEventListener('input', () => {
  setVar('--glass-tint-alpha', `${tintLightAlpha.value}%`);
  tintLightAlphaVal.textContent = `${tintLightAlpha.value}%`;
});

const tintDarkColor = document.getElementById('tintDarkColor');
const tintDarkAlpha = document.getElementById('tintDarkAlpha');
const tintDarkAlphaVal = document.getElementById('tintDarkAlphaVal');
tintDarkColor.addEventListener('input', () => setVar('--glass-tint-dark', hexToTriplet(tintDarkColor.value)));
tintDarkAlpha.addEventListener('input', () => {
  setVar('--glass-tint-alpha-dark', `${tintDarkAlpha.value}%`);
  tintDarkAlphaVal.textContent = `${tintDarkAlpha.value}%`;
});

const darkToggle = document.getElementById('darkToggle');
const darkTintControls = document.getElementById('darkTintControls');
darkToggle.addEventListener('change', () => {
  root.classList.toggle('dark', darkToggle.checked);
  tintDarkColor.disabled = !darkToggle.checked;
  tintDarkAlpha.disabled = !darkToggle.checked;
  darkTintControls.classList.toggle('opacity-40', !darkToggle.checked);
});

// ---------------------------------------------------------------------------
// Variant: Regular / Clear, + the 35% dimming layer
// ---------------------------------------------------------------------------

const variantSelect = document.getElementById('variantSelect');
variantSelect.addEventListener('change', () => {
  glassEls().forEach((el) => el.classList.toggle('liquid-glass-clear', variantSelect.value === 'clear'));
});

const dimToggle = document.getElementById('dimToggle');
dimToggle.addEventListener('change', () => {
  glassEls().forEach((el) => el.classList.toggle('liquid-glass-dim', dimToggle.checked));
});

// ---------------------------------------------------------------------------
// Refraction (layer 4, Chromium-only) — attached by default to every
// actionable [data-liquid-glass] element on load (see the skill's "When to
// attach refraction"), not opt-in per element. Distortion (scale) and lens
// mode are shared knobs broadcast to every attached instance. Chromatic
// aberration is read per-element from data-liquid-glass-aberration (0
// unless an element opts in): on this page only the Sheet opts in, so the
// aberration slider here only ever drives that one controller — matching
// the skill's "reserve aberration for ~2 prominent elements" rule instead
// of exposing it as a blanket knob.
// ---------------------------------------------------------------------------

const defs = document.getElementById('lab-defs');
const refractionControls = document.getElementById('refractionControls');
const refractionUnsupported = document.getElementById('refractionUnsupported');
const scaleRange = document.getElementById('scaleRange');
const scaleVal = document.getElementById('scaleVal');
const caRange = document.getElementById('caRange');
const caVal = document.getElementById('caVal');
const refractBlurRange = document.getElementById('refractBlurRange');
const refractBlurVal = document.getElementById('refractBlurVal');
const lensMode = document.getElementById('lensMode');
const modalSheet = document.getElementById('modalSheet');

const refractionControllers = new Map(); // element -> controller

function attachAllRefraction() {
  if (!isRefractionSupported()) {
    refractionUnsupported.hidden = false;
    refractionControls.classList.add('opacity-40');
    [scaleRange, caRange, refractBlurRange, lensMode].forEach((el) => {
      el.disabled = true;
    });
    return;
  }
  document.querySelectorAll('[data-liquid-glass]').forEach((el) => {
    const aberration = Number(el.getAttribute('data-liquid-glass-aberration')) || 0;
    refractionControllers.set(
      el,
      attachRefraction(el, defs, { scale: Number(scaleRange.value), aberration, mode: lensMode.value })
    );
  });
  setVar('--glass-blur-refract', `${refractBlurRange.value}px`);
}

attachAllRefraction();

scaleRange.addEventListener('input', () => {
  scaleVal.textContent = scaleRange.value;
  refractionControllers.forEach((c) => c.setScale(Number(scaleRange.value)));
});
caRange.addEventListener('input', () => {
  caVal.textContent = caRange.value;
  refractionControllers.get(modalSheet)?.setAberration(Number(caRange.value));
});
refractBlurRange.addEventListener('input', () => {
  refractBlurVal.textContent = `${refractBlurRange.value}px`;
  setVar('--glass-blur-refract', `${refractBlurRange.value}px`);
});
lensMode.addEventListener('change', () => {
  refractionControllers.forEach((c) => c.setMode(lensMode.value));
});

// ---------------------------------------------------------------------------
// Modal / sheet
// ---------------------------------------------------------------------------

const modalOverlay = document.getElementById('modalOverlay');

function openModal() {
  modalOverlay.classList.remove('opacity-0', 'pointer-events-none');
  modalOverlay.setAttribute('aria-hidden', 'false');
  modalSheet.classList.remove('translate-y-4');
}

function closeModal() {
  modalOverlay.classList.add('opacity-0', 'pointer-events-none');
  modalOverlay.setAttribute('aria-hidden', 'true');
  modalSheet.classList.add('translate-y-4');
}

document.getElementById('openModalBtn').addEventListener('click', openModal);
document.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closeModal));

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

document.getElementById('resetBtn').addEventListener('click', () => {
  [
    '--blur-glass',
    '--glass-saturate',
    '--glass-brightness',
    '--radius-glass',
    '--color-glass-rim',
    '--glass-tint',
    '--glass-tint-alpha',
    '--glass-tint-dark',
    '--glass-tint-alpha-dark',
    '--glass-blur-refract',
  ].forEach((name) => root.style.removeProperty(name));

  root.classList.remove('dark');
  glassEls().forEach((el) => el.classList.remove('liquid-glass-clear', 'liquid-glass-dim'));

  blurRange.value = 16;
  blurVal.textContent = '16px';
  saturateRange.value = 180;
  saturateVal.textContent = '180%';
  brightnessRange.value = 1.1;
  brightnessVal.textContent = '1.10';
  radiusRange.value = 20;
  radiusVal.textContent = '20px';
  rimRange.value = 20;
  rimVal.textContent = '20%';
  tintLightColor.value = '#ffffff';
  tintLightAlpha.value = 12;
  tintLightAlphaVal.textContent = '12%';
  tintDarkColor.value = '#000000';
  tintDarkAlpha.value = 40;
  tintDarkAlphaVal.textContent = '40%';
  darkToggle.checked = false;
  tintDarkColor.disabled = true;
  tintDarkAlpha.disabled = true;
  darkTintControls.classList.add('opacity-40');
  variantSelect.value = 'regular';
  dimToggle.checked = false;
  scaleRange.value = 48;
  scaleVal.textContent = '48';
  refractionControllers.forEach((c) => c.setScale(48));
  caRange.value = 12;
  caVal.textContent = '12';
  refractionControllers.get(modalSheet)?.setAberration(12);
  refractBlurRange.value = 3;
  refractBlurVal.textContent = '3px';
  lensMode.value = 'diagonal';
  refractionControllers.forEach((c) => c.setMode('diagonal'));
});
