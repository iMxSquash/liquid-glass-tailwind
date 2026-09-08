---
name: liquid-glass-tailwind
description: Implement Apple's iOS 26 Liquid Glass design language on the web with Tailwind CSS v4 (CSS-first) or plain CSS fallback. Use when the user mentions "liquid glass", "glassmorphism", "iOS 26 style", "frosted glass", "verre liquide", or wants translucent/blurred UI surfaces (navbars, buttons, cards, modals, docks).
---

# Liquid Glass for Tailwind CSS

Apply Apple's iOS 26 Liquid Glass design language to web projects. Primary target: Tailwind CSS v4 (CSS-first, `@theme` + `@utility`). Fallback: plain CSS or Tailwind v3 arbitrary values (see `references/tailwind-v3.md`).

Synthesized from analysis of the leading implementations (glinui, nikdelvin/liquid-glass, glasswindui, creativoma) and physically-based research (kube.io refraction, Apple HIG semantics).

## Design Semantics (from Apple HIG)

These rules come from Apple's own material definition. Encode them in every implementation:

1. **Glass is for the navigation/control layer only**: toolbars, tab bars, buttons, floating controls, docks, modals. Never for content surfaces (text-heavy cards, tables, media containers).
2. **Two variants**:
   - `regular`: adaptive, medium transparency, readability-first. The default.
   - `clear`: high transparency (blur 2-4px, tint 4-6% alpha), only over bold/bright media.
3. **Never glass-on-glass**: never nest two elements with `backdrop-filter`. Each glass surface samples the content behind it, not other glass.
4. The material is a three-part composition: **highlight** (specular rim), **shadow** (depth separation), **illumination** (adaptive tint).

## Layer Anatomy

Five conceptual layers on one element + one pseudo-element (back to front):

1. **Frost** : `backdrop-filter: blur() saturate() brightness()`
2. **Tint** : translucent `background`
3. **Rim** : 1px border with brighter top edge + inset shadows
4. **Sheen** : `::after` diagonal gradient, screen-blended
5. **Refraction** (optional, Chromium only) : SVG `feDisplacementMap` via `backdrop-filter: url(#id)`, with optional chromatic aberration fringes. Non-trivial to get right; follow `references/refraction.md` literally, it contains the verified drop-in implementation

## Consensus Values

The signature Apple look is `saturate(180%)` chained with blur. Key numbers:

| Token | Light mode | Dark mode |
|---|---|---|
| Tint (standard card) | `rgb(255 255 255 / 0.10)` to `0.18` | `rgb(0 0 0 / 0.40)` (black-based, more opaque) |
| Tint scale | 0.06 (crystal) to 0.35 (frosted) | 0.16 to 0.70 |
| Border | `1px rgb(255 255 255 / 0.20)`, top edge `0.40` | alpha `0.10`, top `0.15` |
| Backdrop | `blur(8px) saturate(180%) brightness(1.1)` | same |
| Radius | 16 to 28px, capsule-like (Apple favors large radii) | same |

Blur elevation scale (5 levels): `8px` (subtle) / `12px` / `16px` (standard card) / `24px` (overlay) / `40px` (modal, pair with `saturate(200%)` for frosted).

Add `contrast(80%)` in the backdrop chain for the `regular` readability-first variant over busy backdrops.

Text contrast rule: never rely on the backdrop. For body text over arbitrary imagery use a tint of at least 0.6 alpha behind the text, or `text-shadow: 0 1px 2px rgb(0 0 0 / 0.35)` on light text. Target WCAG AA against the worst-case backdrop.

## Tailwind v4 Implementation (recommended)

### Tokens and utilities

```css
@import "tailwindcss";

@theme {
  --blur-glass-sm: 8px;
  --blur-glass: 16px;
  --blur-glass-lg: 24px;
  --blur-glass-xl: 40px;
  --blur-glass-clear: 3px;

  /* Every knob below is consumed DIRECTLY by var() inside the utility, so
     each one can be overridden at three levels: globally (redefine on
     :root), per subtree (set it on any wrapper), or per element (inline
     style / JS). See "Runtime theming" below for the rule that makes this
     work. Tint is split into channels + alpha so opacity can be driven
     independently of color. */
  --glass-tint: 255 255 255;
  --glass-tint-alpha: 12%;
  --glass-tint-dark: 0 0 0;
  --glass-tint-alpha-dark: 40%;
  --glass-saturate: 180%;
  --glass-brightness: 1.1;
  --glass-blur-refract: 3px;   /* the CSS blur inside the refraction chain, see references/refraction.md */
  --color-glass-rim: rgb(255 255 255 / 0.20);
  --color-glass-rim-top: rgb(255 255 255 / 0.40);

  --radius-glass: 20px;
  --radius-glass-lg: 28px;

  --shadow-glass:
    0 8px 24px rgb(0 0 0 / 0.12),
    0 2px 4px rgb(0 0 0 / 0.08),
    inset 0 1px 0 rgb(255 255 255 / 0.40),
    inset 0 -1px 0 rgb(0 0 0 / 0.05);
  --shadow-glass-lg:
    0 16px 48px rgb(0 0 0 / 0.16),
    0 4px 8px rgb(0 0 0 / 0.08),
    inset 0 1px 1px rgb(255 255 255 / 0.55),
    inset 0 -1px 1px rgb(255 255 255 / 0.30);
  /* Single-shadow liquid rim, very effective on buttons: */
  --shadow-glass-rim: inset 0 0 20px -5px rgb(255 255 255 / 0.70);
}

@custom-variant reduced-transparency (@media (prefers-reduced-transparency: reduce));

@utility liquid-glass {
  position: relative;
  isolation: isolate;          /* bounds blend modes and backdrop scope */
  overflow: hidden;            /* clips edge artifacts */
  border-radius: var(--radius-glass);
  background: rgb(var(--glass-tint) / var(--glass-tint-alpha));
  border: 1px solid var(--color-glass-rim);
  border-top-color: var(--color-glass-rim-top);  /* light refraction edge */
  background-clip: padding-box;
  box-shadow: var(--shadow-glass);
  -webkit-backdrop-filter: blur(var(--blur-glass)) saturate(var(--glass-saturate)) brightness(var(--glass-brightness));
  backdrop-filter: blur(var(--blur-glass)) saturate(var(--glass-saturate)) brightness(var(--glass-brightness));

  /* Sheen: diagonal specular sweep */
  &::after {
    content: "";
    position: absolute; inset: 0; z-index: -1;
    border-radius: inherit; pointer-events: none;
    background: linear-gradient(135deg,
      rgb(255 255 255 / 0.45), rgb(255 255 255 / 0.08) 28%, transparent 58%);
    mix-blend-mode: screen;
  }

  @variant dark {
    background: rgb(var(--glass-tint-dark) / var(--glass-tint-alpha-dark));
    border-color: rgb(255 255 255 / 0.10);
    border-top-color: rgb(255 255 255 / 0.15);
  }
  @variant reduced-transparency {
    background: rgb(245 245 245 / 0.95);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    &::after { display: none; }
  }
}

/* Clear variant: only over bold/bright media */
@utility liquid-glass-clear {
  background: rgb(255 255 255 / 0.05);
  -webkit-backdrop-filter: blur(var(--blur-glass-clear)) saturate(150%);
  backdrop-filter: blur(var(--blur-glass-clear)) saturate(150%);
}

/* Top hairline highlight (cheapest specular, use on navbars) */
@utility glass-hairline {
  &::before {
    content: ""; pointer-events: none; position: absolute;
    inset-inline: 0; top: 0; height: 1px;
    background: linear-gradient(to right,
      transparent, rgb(255 255 255 / 0.70), transparent);
  }
}
```

Because `@utility` participates in variants, `dark:`, `hover:`, `md:` all compose with these.

### Runtime theming (one place, whole app)

The knobs (`--glass-tint`, `--glass-tint-alpha`, `--glass-saturate`, `--glass-brightness`, `--glass-blur-refract`, `--blur-glass`, `--radius-glass`...) cascade like any custom property, so the same utility can be reconfigured at three levels without touching its definition:

```css
/* Globally: every liquid-glass component in the app follows */
:root { --glass-tint-alpha: 20%; --blur-glass: 24px; }

/* Per subtree: only glass inside this wrapper changes */
.hero { --glass-saturate: 200%; }
```

```js
// Per element, e.g. driven by a live control
el.style.setProperty('--glass-tint-alpha', '35%');
```

**The rule that makes this work (verified live): a knob must be consumed directly by `var()` in the final declaration.** Never build one configurable custom property out of another, e.g. `--color-glass-tint: rgb(255 255 255 / var(--glass-tint-alpha))` declared on `:root`: a `var()` nested inside a custom property is resolved where that property is DECLARED (`:root`), and descendants inherit the already-resolved value. Overriding the inner token on a component or wrapper then silently does nothing, no error, no visual change. Global `:root` overrides still work in that setup (everything resolves in the same place), which makes the bug easy to miss until the first per-element control is wired.

### Fallback cascade (three tiers)

Do NOT use `@supports (backdrop-filter: url(#f))`: it tests parsing, not rendering, and false-positives in Safari. Use declaration-order degradation instead:

```css
/* Tier 0: no backdrop-filter support at all -> readable opaque card */
.liquid-glass-fallback {
  background: rgb(245 245 245 / 0.92);
  border: 1px solid rgb(0 0 0 / 0.08);
}

/* Tier 1: blur everywhere backdrop-filter exists */
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .liquid-glass-fallback {
    background: rgb(255 255 255 / 0.10);
    backdrop-filter: blur(16px) saturate(180%);
  }
}

/* Tier 2: refraction, Chromium keeps the second declaration, others drop it */
.liquid-glass-refract {
  backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(2px) url(#liquid-glass-refraction) saturate(180%) brightness(1.08);
}
```

## Component Patterns

Utility-class usage (works with the `@utility` definitions above):

```html
<!-- Card -->
<div class="liquid-glass p-6">...</div>

<!-- Navbar -->
<nav class="liquid-glass glass-hairline fixed top-0 inset-x-0 z-50 h-16 rounded-none border-x-0 border-t-0">
  ...
</nav>

<!-- Button -->
<button class="liquid-glass px-5 py-2.5 rounded-full text-white font-medium
  shadow-(--shadow-glass-rim)
  transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
  hover:-translate-y-px hover:bg-white/20 active:scale-[0.97]
  focus-visible:outline-2 focus-visible:outline-[#0a84ff] focus-visible:outline-offset-2">
  Label
</button>

<!-- Modal / sheet: heavier frost -->
<div class="liquid-glass rounded-t-(--radius-glass-lg)
  backdrop-blur-(--blur-glass-xl) backdrop-saturate-200 p-6
  shadow-(--shadow-glass-lg)">
  ...
</div>

<!-- Segmented control -->
<div class="liquid-glass inline-flex rounded-xl p-1">
  <button class="px-4 py-2 rounded-lg text-sm font-medium bg-white/20 shadow-sm">Active</button>
  <button class="px-4 py-2 rounded-lg text-sm font-medium opacity-60 hover:opacity-90 transition-opacity">Inactive</button>
</div>
```

Hover shine sweep (premium button effect): an `::after` bar (`-inset-y-16 -left-20 w-24 rotate-12`) with `linear-gradient(100deg, transparent 20%, rgb(255 255 255 / 0.9) 50%, transparent 80%)`, `opacity-70 blur-sm`, translated `translate-x-28` on hover.

## Interaction and Motion

- Hover: `-translate-y-px` or `scale(1.01)`, tint opacity +0.06 to +0.10
- Active: `scale(0.97)`
- Easing: `cubic-bezier(0.2, 0, 0, 1)`, 150-400ms
- Never animate blur radius or element size (forces filter re-run every frame)
- Animate `transform`, `opacity`, or the SVG `feDisplacementMap.scale` attribute only

## Accessibility (non-optional)

Include these blocks in the generated CSS by default:

```css
@media (prefers-reduced-transparency: reduce) {
  .liquid-glass { background: rgb(245 245 245 / 0.98); backdrop-filter: none; -webkit-backdrop-filter: none; }
  .liquid-glass::after { display: none; }
}
/* Safari/Firefox never match reduced-transparency; prefers-contrast is the safety net */
@media (prefers-contrast: more) {
  .liquid-glass {
    background: Canvas; color: CanvasText;
    border: 1px solid CanvasText;
    backdrop-filter: none; -webkit-backdrop-filter: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .liquid-glass, .liquid-glass::after { transition: none; animation: none; }
}
```

- Focus rings vanish against refracted backdrops. Use a two-tone ring: `outline: 2px solid #0a84ff; outline-offset: 2px; box-shadow: 0 0 0 4px rgb(255 255 255 / 0.9);`
- Hit targets at least 44x44px
- Hidden filter SVG: `width="0" height="0" aria-hidden="true"`

## Performance Budget

- Each `backdrop-filter` element costs a backdrop readback + offscreen GPU texture. Cost scales with element area and blur radius.
- Hard limits: **at most 2 refracting elements, at most 5 blurred glass surfaces per viewport**, no glass-on-glass.
- Add `contain: layout paint style;` on glass elements; `isolation: isolate` on the parent.
- `will-change: transform` only on elements that actually move (never `will-change: backdrop-filter`).
- Keep glass off full-viewport scrolling surfaces on mobile.

## Anti-Patterns

- Blur above 40px, or blur on the refraction path above 2-4px (displacement does the work)
- Fully transparent backgrounds (minimum 0.04 tint alpha)
- Borders heavier than 1px
- More than 3 radius values in one project
- Nested translucent layers
- `@supports (backdrop-filter: url(...))` for refraction detection
- Putting blur/saturate inside the SVG filter instead of chaining them as CSS functions (breaks Chrome's pipeline)
- Percentage-sized filter region or feImage for refraction: the map lands oversized and shifted, refraction shows only near the bottom-right corner (size both in exact element pixels)
- Building the displacement map from SVG gradients + mix-blend-mode inside feImage (silently produces a broken map; draw it on a canvas)
- Skipping the opaque Tier 0 fallback

## References

- `references/refraction.md`: true SVG refraction, Chromium-only, verified end to end. Contains the complete drop-in runtime (per-element pixel-sized filters, canvas SDF displacement maps with two lens modes, chromatic aberration, ResizeObserver sizing, feature probe, accessibility guards), the verified tuning table, and the list of silent traps with their symptom signatures. Follow it literally rather than reimplementing from memory
- `references/tailwind-v3.md`: Tailwind v3 equivalents (arbitrary values, plugin variants)
