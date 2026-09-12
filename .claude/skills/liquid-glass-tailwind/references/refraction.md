# True Refraction with SVG Displacement (Chromium only)

The refraction layer is what separates Liquid Glass from basic glassmorphism: the backdrop bends through the element's edges like a lens, with optional chromatic aberration fringes. It relies on `backdrop-filter: url(#svgFilter)`, which only Chromium renders (Chrome, Edge, Opera, Electron). Safari and Firefox support SVG filters on `filter:` but not on `backdrop-filter:`; always keep the blur+saturate fallback from SKILL.md.

Everything below was debugged and verified visually in Chrome (September 2026). Follow it literally; each trap listed was hit for real and produces a silent, misleading failure.

## The verified effect, in one paragraph

A per-element SVG filter whose displacement map is drawn pixel by pixel on a canvas from the rounded-rect signed distance field: neutral center (128/128), eased refracting band along all four edges. The backdrop is displaced three times at slightly different scales (R strongest, B weakest), each pass isolated to one color channel, recombined with screen blending: rainbow fringes appear only where the lens bends. Applied as `backdrop-filter: blur(var(--glass-blur-refract)) url("#id") saturate(var(--glass-saturate)) brightness(var(--glass-brightness))` inline by JS on Chromium only, with CSS keeping the cross-browser glassmorphism fallback. Every value is a theme knob, not a hard-coded number — see SKILL.md's "Runtime theming".

## Non-negotiable rules (each one verified the hard way)

1. **`color-interpolation-filters="sRGB"` on the `<filter>`**. The SVG default (linearRGB) remaps gray 128 and produces a uniform diagonal shift artifact.
2. **Size the `<filter>` region AND the `feImage` in exact element pixels, never percentages.** The default filter region is 120% of the element (10% overflow each side) and a percentage-sized feImage aligns to that region, landing the map oversized and shifted up-left. Symptom signature: refraction visible only near the bottom-right corner, whatever the map contains, surviving every map rewrite. One filter per element size, rebuilt on resize.
3. **Never build the map from SVG gradients + `mix-blend-mode`.** Blend modes are not reliably applied inside an SVG loaded through feImage: the map silently comes out wrong (two-edge distortion plus a global content shift that grows with scale). Draw the map on a canvas.
4. **Keep the SVG filter displacement-only** (plus its channel plumbing) and chain blur/saturate/brightness as CSS functions in the backdrop-filter list. Chrome mishandles url() filters containing their own heavy blur combined with CSS functions.
5. **Inline the `<filter>` in the same document.** External `url(file.svg#f)` is unreliable for backdrop-filter.
6. **Run the wiring script after the DOM is parsed** (DOMContentLoaded or end of body): a script at the top of `<body>` sees none of the target elements.
7. **Do an immediate rebuild for already-laid-out elements.** ResizeObserver callbacks ride the rendering steps and can be throttled (occluded window); keep the observer for resizes and late layout (hidden elements appearing).
8. **Skip the whole enhancement when `prefers-reduced-transparency: reduce` or `prefers-contrast: more` matches**: the inline style would override the CSS accessibility fallbacks.
9. **No `mask-image` on any ancestor of the refracting element.** A `mask-image` (including the Scroll Edge Effect's mask-based variant, see SKILL.md) creates a new backdrop-root on the element that carries it, which silently caps every descendant's `backdrop-filter` to sampling only within that masked subtree. Verified symptom: everything about the filter looks correct (computed `backdrop-filter` shows the right `url(...)` chain, the generated displacement map samples correctly non-neutral at the edges) yet the element renders completely flat, undistorted, no console error — the fix is removing the mask from the ancestor (or moving the fade to its own separate overlay element) rather than debugging the filter math.

## feDisplacementMap mechanics

- `P'(x,y) = P(x + scale * (XC(x,y) - 0.5), y + scale * (YC(x,y) - 0.5))`; XC/XY are the map's channels normalized 0-1.
- Convention: **R = X displacement, G = Y displacement** (`xChannelSelector="R" yChannelSelector="G"`); **128 = zero displacement**.
- Animate only the `scale` attribute (cheap); any shape/size change requires a map rebuild.

## Drop-in implementation (verified)

HTML: one empty hidden SVG that JS fills with per-element filters.

```html
<svg id="liquid-glass-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"></svg>
```

CSS keeps only the cross-browser fallback on the glass elements (see SKILL.md); JS overrides it inline on Chromium:

```js
(function () {
  // Style-probe: only Chromium accepts url() in backdrop-filter.
  var probe = document.createElement('div');
  probe.style.cssText = 'backdrop-filter: url(#probe)';
  var supported =
    probe.style.backdropFilter === 'url(#probe)' || probe.style.backdropFilter === 'url("#probe")';
  if (!supported) return;
  // Inline styles would defeat the CSS accessibility fallbacks.
  if (
    matchMedia('(prefers-reduced-transparency: reduce)').matches ||
    matchMedia('(prefers-contrast: more)').matches
  ) {
    return;
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var defs = document.getElementById('liquid-glass-defs');

  // Signed distance to a rounded rectangle centered in (w, h); negative inside.
  function roundedRectSdf(x, y, w, h, r) {
    var qx = Math.abs(x - w / 2) - (w / 2 - r);
    var qy = Math.abs(y - h / 2) - (h / 2 - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }

  // mode 'diagonal': constant down-right displacement direction, the SDF only
  // shapes the band and its strength. The whole ring refracts: sampling goes
  // outward at the bottom-right (positive lens) and inward at the top-left
  // (negative lens), like glass lit from the top-left - matches the sheen.
  // mode 'symmetric': outward SDF normals, classic magnifier rim on all edges.
  function buildDisplacementMap(w, h, r, edge, mode) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(w, h);
    var data = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var inside = -roundedRectSdf(x + 0.5, y + 0.5, w, h, r);
        var nx = 0;
        var ny = 0;
        if (inside < edge) {
          var t = Math.min(1, Math.max(0, 1 - inside / edge));
          var mag = t * t; // full at the border, eased to zero at the band's inner limit
          if (mode === 'symmetric') {
            var gx = roundedRectSdf(x + 1.5, y + 0.5, w, h, r) - roundedRectSdf(x - 0.5, y + 0.5, w, h, r);
            var gy = roundedRectSdf(x + 0.5, y + 1.5, w, h, r) - roundedRectSdf(x + 0.5, y - 0.5, w, h, r);
            var len = Math.hypot(gx, gy) || 1;
            nx = (gx / len) * mag;
            ny = (gy / len) * mag;
          } else {
            nx = Math.SQRT1_2 * mag;
            ny = Math.SQRT1_2 * mag;
          }
        }
        var i = (y * w + x) * 4;
        data[i] = Math.round(128 + nx * 127);
        data[i + 1] = Math.round(128 + ny * 127);
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }

  // Chromatic aberration: three displacement passes (R at scale+ca, G at
  // scale, B at scale-ca), each isolated to one channel, screen-blended.
  // Fringes only appear along the refracting band. ca = 0 degrades exactly
  // to a single-pass filter. Cost: 3x displacement - hero elements only.
  var uid = 0;
  function attachRefraction(el, opts) {
    var scale = (opts && opts.scale) || 48;
    var ca = (opts && opts.aberration != null) ? opts.aberration : 8;
    var mode = (opts && opts.mode) || 'diagonal';
    var id = 'liquid-glass-refraction-' + uid++;

    var filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    var feImage = document.createElementNS(SVG_NS, 'feImage');
    feImage.setAttribute('preserveAspectRatio', 'none');
    feImage.setAttribute('result', 'map');
    filter.appendChild(feImage);
    var feBlurEl = document.createElementNS(SVG_NS, 'feGaussianBlur');
    feBlurEl.setAttribute('in', 'SourceGraphic');
    feBlurEl.setAttribute('stdDeviation', '1.5');
    feBlurEl.setAttribute('result', 'soft');
    filter.appendChild(feBlurEl);
    [
      ['R', scale + ca, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
      ['G', scale, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
      ['B', scale - ca, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'],
    ].forEach(function (c) {
      var disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
      disp.setAttribute('in', 'soft');
      disp.setAttribute('in2', 'map');
      disp.setAttribute('scale', c[1]);
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');
      filter.appendChild(disp);
      var cm = document.createElementNS(SVG_NS, 'feColorMatrix');
      cm.setAttribute('values', c[2]);
      cm.setAttribute('result', 'chan' + c[0]);
      filter.appendChild(cm);
    });
    var blend1 = document.createElementNS(SVG_NS, 'feBlend');
    blend1.setAttribute('in', 'chanR');
    blend1.setAttribute('in2', 'chanG');
    blend1.setAttribute('mode', 'screen');
    blend1.setAttribute('result', 'chanRG');
    filter.appendChild(blend1);
    var blend2 = document.createElementNS(SVG_NS, 'feBlend');
    blend2.setAttribute('in', 'chanRG');
    blend2.setAttribute('in2', 'chanB');
    blend2.setAttribute('mode', 'screen');
    filter.appendChild(blend2);
    defs.appendChild(filter);

    function rebuild(w, h) {
      var radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16;
      var edge = Math.min(42, w / 6, h / 6);
      ['x', 'y'].forEach(function (a) {
        filter.setAttribute(a, '0');
        feImage.setAttribute(a, '0');
      });
      filter.setAttribute('width', w);
      filter.setAttribute('height', h);
      feImage.setAttribute('width', w);
      feImage.setAttribute('height', h);
      feImage.setAttribute('href', buildDisplacementMap(w, h, radius, edge, mode));
      // var() in an inline style resolves against the element, so the
      // enhanced chain keeps honoring the SKILL.md theme knobs at every
      // level (global, subtree, per element) — --glass-blur-refract
      // included, never hard-code this value (see "Runtime theming" in
      // SKILL.md for why a nested var() would silently break overrides).
      el.style.backdropFilter =
        'blur(var(--glass-blur-refract, 3px)) url("#' +
        id +
        '") saturate(var(--glass-saturate, 180%)) brightness(var(--glass-brightness, 1.08))';
    }

    new ResizeObserver(function (entries) {
      var box = entries[entries.length - 1].contentRect;
      var w = Math.round(el.offsetWidth);
      var h = Math.round(el.offsetHeight);
      if (w > 0 && h > 0 && box.width > 0) rebuild(w, h);
    }).observe(el);

    var w0 = Math.round(el.offsetWidth);
    var h0 = Math.round(el.offsetHeight);
    if (w0 > 0 && h0 > 0) rebuild(w0, h0);
  }

  // Refraction is the default for every actionable [data-liquid-glass]
  // element (see SKILL.md's "When to attach refraction") - aberration
  // defaults to 0 (single-pass, cheap) unless an element opts into the
  // more expensive chromatic-aberration look via
  // data-liquid-glass-aberration="12" (reserve that for ~2 prominent
  // elements per viewport, per the Performance Budget).
  function init() {
    document.querySelectorAll('[data-liquid-glass]').forEach(function (el) {
      var aberration = Number(el.getAttribute('data-liquid-glass-aberration')) || 0;
      attachRefraction(el, { aberration: aberration });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

For a statically-sized element, the filter can be inlined in markup instead (same primitives, pixel width/height hardcoded); keep the map generation in JS regardless (rule 3).

## Verified tuning values

| Knob | Verified default | Range that reads well |
|---|---|---|
| `scale` (base displacement) | 48 | 30-70; negative flips the lens direction |
| `aberration` (per-channel scale spread) | 8 (subtle) | 0 (off) to 16 (very visible); above that it reads as a glitch |
| `edge` (band width) | `min(42, w/6, h/6)` px | 30-50 on panels 200px and up |
| CSS blur in the enhanced chain (`--glass-blur-refract`) | 3px | 2-4px; displacement does the frosting, more blur drowns it |
| feGaussianBlur `stdDeviation` | 1.5 | 1-2; softens the displaced backdrop |
| saturate / brightness | 180% / 1.08 | per SKILL.md |
| Lens mode | `diagonal` | `symmetric` for a classic uniform magnifier rim |

## Sanity-check the generated map (no browser needed)

Run the same map code in Node and sample it; this catches the whole class of asymmetry bugs:

- symmetric mode: left edge R < 128, right edge R > 128, top G < 128, bottom G > 128, corners both channels off-center, center exactly 128/128.
- diagonal mode: every band sample has R = G > 128 (all displacement points down-right), full strength on all four edges AND corners, center exactly 128/128.

## Browser support matrix (September 2026)

| Capability | Chromium | Safari | Firefox |
|---|---|---|---|
| `backdrop-filter: blur()/saturate()` | yes (76+) | yes (9+, keep `-webkit-` prefix) | yes (103+) |
| `backdrop-filter: url(#svgFilter)` | **yes, only engine** | no | no |
| `filter: url(#svgFilter)` | yes | yes | yes |
| `prefers-reduced-transparency` | yes (118+) | no | behind flag |

Do NOT detect refraction support with `@supports (backdrop-filter: url(#f))`: it tests parsing, not rendering, and false-positives in Safari. Use the style-probe above (JS) or the CSS double-declaration from SKILL.md (declaration order: Chromium keeps the url() declaration, others drop it).

## Performance

- Refraction itself (single-pass, `aberration: 0`) is meant to run on every actionable `[data-liquid-glass]` element — see SKILL.md's "When to attach refraction" and "Performance Budget". Chromatic aberration specifically is what's expensive (triples the displacement cost): budget at most ~2 elements per viewport with `aberration > 0`, reserved for prominent/infrequent surfaces (a modal, a dock), not every button.
- Never animate blur radius or element size; animate `transform`, `opacity`, or the `scale` attributes.
- The map rebuild is the expensive step (canvas + toDataURL): it only happens on resize, never per frame. With refraction on many small controls, the cost is one canvas per element on resize, not proportional to how many share the same visual style.
