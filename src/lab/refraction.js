// Refraction module for the Liquid Glass Lab.
//
// Fresh implementation of the `apple-design` skill's
// references/web-liquid-glass-refraction.md drop-in technique (per-element
// pixel-sized SVG filter, canvas-drawn rounded-rect SDF displacement map,
// three-channel chromatic aberration, screen-blended). Deliberately not
// imported from ../refraction.js (the project's own, older
// liquid-glass-tailwind-skill demo) so this lab exercises the apple-design
// skill's reference in isolation.
//
// Extended with setScale/setAberration/setMode so the lab's live sliders can
// retune an attached filter: scale/aberration are cheap (attribute-only, per
// the reference's "animate only the scale attribute" rule), mode requires a
// map rebuild since the mode is baked into the displacement map itself.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Signed distance to a rounded rectangle centered in (w, h); negative inside.
function roundedRectSdf(x, y, w, h, r) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function buildDisplacementMap(w, h, r, edge, mode) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = -roundedRectSdf(x + 0.5, y + 0.5, w, h, r);
      let nx = 0;
      let ny = 0;
      if (inside < edge) {
        const t = Math.min(1, Math.max(0, 1 - inside / edge));
        const mag = t * t; // full at the border, eased to zero at the band's inner limit
        if (mode === 'symmetric') {
          const gx = roundedRectSdf(x + 1.5, y + 0.5, w, h, r) - roundedRectSdf(x - 0.5, y + 0.5, w, h, r);
          const gy = roundedRectSdf(x + 0.5, y + 1.5, w, h, r) - roundedRectSdf(x + 0.5, y - 0.5, w, h, r);
          const len = Math.hypot(gx, gy) || 1;
          nx = (gx / len) * mag;
          ny = (gy / len) * mag;
        } else {
          nx = Math.SQRT1_2 * mag;
          ny = Math.SQRT1_2 * mag;
        }
      }
      const i = (y * w + x) * 4;
      data[i] = Math.round(128 + nx * 127);
      data[i + 1] = Math.round(128 + ny * 127);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

// Style-probe: only Chromium accepts url() in backdrop-filter.
export function isRefractionSupported() {
  const probe = document.createElement('div');
  probe.style.cssText = 'backdrop-filter: url(#probe)';
  return probe.style.backdropFilter === 'url(#probe)' || probe.style.backdropFilter === 'url("#probe")';
}

let uid = 0;

export function attachRefraction(el, defs, opts = {}) {
  let scale = opts.scale ?? 48;
  let ca = opts.aberration ?? 8;
  let mode = opts.mode ?? 'diagonal';
  const id = 'lab-refraction-' + uid++;

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const feImage = document.createElementNS(SVG_NS, 'feImage');
  feImage.setAttribute('preserveAspectRatio', 'none');
  feImage.setAttribute('result', 'map');
  filter.appendChild(feImage);

  const feBlurEl = document.createElementNS(SVG_NS, 'feGaussianBlur');
  feBlurEl.setAttribute('in', 'SourceGraphic');
  feBlurEl.setAttribute('stdDeviation', '1.5');
  feBlurEl.setAttribute('result', 'soft');
  filter.appendChild(feBlurEl);

  const channels = [
    { key: 'R', matrix: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' },
    { key: 'G', matrix: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' },
    { key: 'B', matrix: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' },
  ].map((c) => {
    const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
    disp.setAttribute('in', 'soft');
    disp.setAttribute('in2', 'map');
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'G');
    filter.appendChild(disp);
    const cm = document.createElementNS(SVG_NS, 'feColorMatrix');
    cm.setAttribute('values', c.matrix);
    cm.setAttribute('result', 'chan' + c.key);
    filter.appendChild(cm);
    return { ...c, disp };
  });

  const blend1 = document.createElementNS(SVG_NS, 'feBlend');
  blend1.setAttribute('in', 'chanR');
  blend1.setAttribute('in2', 'chanG');
  blend1.setAttribute('mode', 'screen');
  blend1.setAttribute('result', 'chanRG');
  filter.appendChild(blend1);

  const blend2 = document.createElementNS(SVG_NS, 'feBlend');
  blend2.setAttribute('in', 'chanRG');
  blend2.setAttribute('in2', 'chanB');
  blend2.setAttribute('mode', 'screen');
  filter.appendChild(blend2);

  defs.appendChild(filter);

  function applyScales() {
    channels[0].disp.setAttribute('scale', scale + ca); // R
    channels[1].disp.setAttribute('scale', scale); // G
    channels[2].disp.setAttribute('scale', scale - ca); // B
  }

  function rebuild() {
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (w <= 0 || h <= 0) return;
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16;
    const edge = Math.min(42, w / 6, h / 6);
    ['x', 'y'].forEach((a) => {
      filter.setAttribute(a, '0');
      feImage.setAttribute(a, '0');
    });
    filter.setAttribute('width', w);
    filter.setAttribute('height', h);
    feImage.setAttribute('width', w);
    feImage.setAttribute('height', h);
    feImage.setAttribute('href', buildDisplacementMap(w, h, radius, edge, mode));
    applyScales();
    const chain = `blur(var(--glass-blur-refract, 3px)) url("#${id}") saturate(var(--glass-saturate, 180%)) brightness(var(--glass-brightness, 1.08))`;
    el.style.backdropFilter = chain;
    el.style.webkitBackdropFilter = chain;
  }

  const ro = new ResizeObserver(() => rebuild());
  ro.observe(el);
  rebuild();

  return {
    setScale(v) {
      scale = v;
      applyScales();
    },
    setAberration(v) {
      ca = v;
      applyScales();
    },
    setMode(v) {
      mode = v;
      rebuild();
    },
    destroy() {
      ro.disconnect();
      filter.remove();
      el.style.backdropFilter = '';
      el.style.webkitBackdropFilter = '';
    },
  };
}
