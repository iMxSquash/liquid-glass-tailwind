---
name: liquid-glass-tailwind
description: Reference for THIS repo's own Tailwind v4 Liquid Glass tokens/utilities (`@theme`, `@utility` in this project's CSS) and its SVG refraction technique. Use only when working inside this project. For general Liquid Glass design rules or a new/other project, prefer the `apple-design` skill instead (self-contained for both native and Tailwind/CSS work).
---

# Liquid Glass for Tailwind CSS

Apply Apple's iOS 26 Liquid Glass design language to web projects. Primary target: Tailwind CSS v4 (CSS-first, `@theme` + `@utility`). Fallback: plain CSS or Tailwind v3 arbitrary values (see `references/tailwind-v3.md`).

Synthesized from analysis of the leading implementations (glinui, nikdelvin/liquid-glass, glasswindui, creativoma), physically-based research (kube.io refraction), and Apple's own documentation (developer.apple.com/documentation/technologyoverviews/liquid-glass, .../adopting-liquid-glass, and the HIG Materials page — crawled live September 2026, see "Provenance" at the end of this file).

## Design Semantics (essentials)

Apple's exact wording: Liquid Glass "combines the optical properties of glass with a sense of fluidity" — a dynamic material, not a static blur-and-tint effect. Three rules to encode in every implementation:

1. **Glass is for the navigation/control layer only** (toolbars, tab bars, buttons, floating controls, docks, modals), never content surfaces — except a transient interactive state (slider/toggle briefly glass while dragged/pressed).
2. **Two variants**: `regular` (adaptive, medium transparency, readability-first, the default) vs `clear` (high transparency, only over bold/bright media, with a dark dimming layer at **35% opacity** over bright content).
3. **Never glass-on-glass**, never a competing opaque `bg-*` left under a `liquid-glass` element (strip it first).

Full HIG rationale (per-platform vibrancy, adoption/migration checklist, why each rule exists) and the cross-reference to the native (SwiftUI/UIKit) side of this material: see the `apple-design` skill when working in a repo that has it.

## Layer Anatomy

Four conceptual layers on one element (back to front):

1. **Frost** : `backdrop-filter: blur() saturate() brightness()`
2. **Tint** : translucent `background`
3. **Rim** : 1px uniform border + inset shadows
4. **Refraction** (Chromium only, default on actionable elements, see below) : SVG `feDisplacementMap` via `backdrop-filter: url(#id)`, with chromatic aberration reserved for a handful of prominent elements. Non-trivial to get right; follow `references/refraction.md` literally, it contains the verified drop-in implementation

## When to Attach Refraction (default, not an occasional extra)

Natively, Apple doesn't apply Liquid Glass's lensing as a one-off flourish on a single showcase surface — it's part of the material itself, automatically present on essentially every *discrete control* built from it: buttons, toggles, sliders, segmented controls, sheets, dock icons. Default to attaching refraction on every **actionable** Liquid Glass element (anything tapped, clicked, or dragged), not just one hero card; a static content backdrop with no interaction can skip it.

**Navbar/toolbar exception — the bar itself is not automatically a "control":** a classic full-width top navbar or header (mostly static/informational chrome that content scrolls beneath) stays **blur + saturate only, no refraction** — the plain Regular-material treatment Apple itself uses for that kind of large background chrome. Reserve refraction on the bar *itself* for when it behaves like an app-style control surface in its own right: compact, often floating rather than edge-to-edge, closer to a dock or a floating toolbar puck than a page header. The individual buttons/icons *inside* an ordinary navbar still default to refraction — it's specifically the large bar-as-background-chrome that's the exception, not the controls sitting on it.

Keep **chromatic aberration** specifically scarce, not refraction itself: it triples the displacement cost. Default `aberration: 0` (a clean single-pass lens, still visibly bends the backdrop) on ordinary controls, and reserve `aberration > 0` for at most ~2 prominent elements per viewport (a floating dock, a large modal).

## Consensus Values

The signature Apple look is `saturate(180%)` chained with blur. Key numbers:

| Token | Light mode | Dark mode |
|---|---|---|
| Tint (standard card) | `rgb(255 255 255 / 0.10)` to `0.18` | `rgb(0 0 0 / 0.40)` (black-based, more opaque) |
| Tint scale | 0.06 (crystal) to 0.35 (frosted) | 0.16 to 0.70 |
| Border | `1px rgb(255 255 255 / 0.20)` | alpha `0.10` |
| Backdrop | `blur(8px) saturate(180%) brightness(1.1)` | same |
| Radius | 16 to 28px, capsule-like (Apple favors large radii) | same |

Blur elevation scale (5 levels): `8px` (subtle) / `12px` / `16px` (standard card) / `24px` (overlay) / `40px` (modal, pair with `saturate(200%)` for frosted).

Add `contrast(80%)` in the backdrop chain for the `regular` readability-first variant over busy backdrops.

Text contrast rule: never rely on the backdrop. For body text over arbitrary imagery use a tint of at least 0.6 alpha behind the text, or `text-shadow: 0 1px 2px rgb(0 0 0 / 0.35)` on light text. Target WCAG AA against the worst-case backdrop.

## Concentric corners (nested radius)

Note on sourcing: Apple's adoption docs say the shape of the hardware "informs the curvature, size, and shape of nested interface elements" and that sections/rows get "an increased corner radius to match the curvature of controls across the system" — that's the design principle, stated in prose, not a numeric formula. Apple does not publish a literal `child = parent - padding` equation; the formula below is this skill's own derivation for reproducing that stated principle precisely in CSS, verified to look correct in practice. Don't present it to anyone as a quoted Apple number.

The rule: any rounded shape nested inside another must stay concentric, i.e. share the same center of curvature. That means the formula is not "pick a smaller radius that looks about right" but:

```
child-radius = parent-radius - padding
```

- Padding is the gap between the parent's edge and the child's edge on the side that matters (usually uniform padding, so one number). If the parent's padding differs per side, use the padding on the side the corner actually touches.
- If `parent-radius - padding` would go to zero or negative, clamp to a small floor (~2-4px) instead of a hard square corner — a corner that's barely rounded still reads as intentional, a perfect square inside a rounded parent reads as a bug.
- Applies at every nesting depth: a `liquid-glass` panel (radius R, padding P) containing rows, which themselves contain a nested badge with its own padding, needs radius `R - P` on the rows and `(R - P) - P2` on the badge — never a flat "medium/large" guess at each level.
- Tailwind v4: when the parent's radius is a token (`--radius-glass`, `--radius-glass-lg`), express the child as `calc()` against that same token — e.g. parent `rounded-(--radius-glass) p-2` (8px padding) → child `rounded-[calc(var(--radius-glass)-8px)]` — so the relationship survives if the token changes. When the parent's radius is itself a literal Tailwind utility (e.g. `rounded-lg` = 8px) rather than a token, compute the literal once and hardcode the child's arithmetic result (e.g. `p-1` = 4px padding → child `rounded-[4px]`); don't invent a `rounded-md`/`rounded-sm` guess that happens to look close.
- Common miss: a dropdown/menu panel (glass surface, its own radius + padding) whose item rows use a generic `rounded-md` instead of the padding-subtracted value — the rows' corners then don't share the panel's arc and the nesting looks slightly "off" even though nothing is obviously broken.

## Background Extension Effect

Apple's own term for a specific technique used under sidebars/inspectors: the content that would otherwise end abruptly at the glass panel's edge is instead mirrored/stretched to visually continue underneath it, then blurred — "mirrors the adjacent content to give the impression of stretching it under the sidebar, and applies a blur to maintain legibility." This is different from a plain `backdrop-filter` card, which only samples whatever is *actually* behind it: here the content itself is extended (duplicated/scaled) into the region the glass covers, so the glass has something coherent to blur instead of a hard content/empty-space seam.

Web approximation (CSS-only, no true content mirroring needed for most layouts):

```html
<div class="relative isolate flex">
  <!-- Content pane: bleed it under the sidebar with negative margin + z-index so it's there to blur -->
  <main class="flex-1 -ml-[--sidebar-w] pl-[--sidebar-w] overflow-hidden">
    ...content, edge-to-edge...
  </main>
  <!-- Sidebar: glass floats above the extended content -->
  <aside class="liquid-glass w-(--sidebar-w) shrink-0 z-10">...</aside>
</div>
```

The key move is layout, not filter: let the content layer render *underneath* the full footprint of the glass panel (edge-to-edge, `position` overlap or negative margin) rather than stopping at the panel's boundary, so `backdrop-filter` on the panel has real pixels to blur instead of the page background/void. For a hero image or media strip specifically, this can literally mean rendering the same image at 100% width behind the sidebar and cropping, rather than fighting the layout to avoid the overlap.

## Scroll Edge Effect

Apple's own term for the fade/blur that appears where scrollable content passes beneath a fixed toolbar or tab bar, so the control stays legible against whatever scrolls under it: "blurring and reducing the opacity of background content" at that edge specifically (not the whole surface uniformly).

CSS approximation with a `mask-image` gradient on the scroll container (cheaper than a second blurred layer) or a thin blurred overlay strip:

```css
@utility scroll-edge-fade {
  mask-image: linear-gradient(to bottom, transparent, black 24px);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 24px);
}
```

```html
<!-- Fixed glass toolbar -->
<header class="liquid-glass fixed top-0 inset-x-0 z-50 h-14">...</header>

<!-- Scrolling content: masked so it visually fades right at the toolbar's lower edge -->
<main class="pt-14 overflow-y-auto scroll-edge-fade">...</main>
```

Alternatively, layer a short (24-40px) `liquid-glass-clear`-style blur strip positioned to overlap just the last few pixels of content under the toolbar, so content doesn't hard-cut but visibly loses contrast as it approaches the control — closer to Apple's actual look than a pure opacity mask, at the cost of one more blurred element (counts against the 5-glass-surface budget below).

**Trap, verified live: don't use the `mask-image` variant on the scroll container if anything inside it uses refraction (or otherwise needs `backdrop-filter` to sample content outside that container).** `mask-image` creates a new backdrop-root, which silently limits every descendant's `backdrop-filter` to sampling only within that masked subtree — a refracting glass card scrolling inside a `mask-image`-faded container goes completely flat (computed `backdrop-filter` still reports the correct `url(...)` chain, the displacement map still generates correctly) with no console error. Use the overlay-strip variant instead whenever the scrolling content also contains glass/refracting elements.

## Layout Adjustments When Migrating to Glass

Apple's adoption guidance for anything gaining a glass navigation/control layer, ported to web layout terms:

- **More generous row height and padding** on organizational components (lists, tables, forms) — glass reads as "airy," cramped rows undercut it.
- **Sheets/modals inset from the viewport edge**, not flush, so content is visible peeking around them; a bottom sheet that expands to full height should transition to a *more opaque* background at that point (state-driven opacity, not fixed) since it no longer needs to show anything behind it.
- Audit existing solid/gradient backgrounds on nav elements before adding glass (see Design Semantics rule 3 above) — this is the most common integration bug: leftover opaque `bg-white`/`bg-slate-900` etc. under a new `liquid-glass` class just produces an opaque card with a border, not glass.

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
  background-clip: padding-box;
  box-shadow: var(--shadow-glass);
  -webkit-backdrop-filter: blur(var(--blur-glass)) saturate(var(--glass-saturate)) brightness(var(--glass-brightness));
  backdrop-filter: blur(var(--blur-glass)) saturate(var(--glass-saturate)) brightness(var(--glass-brightness));

  @variant dark {
    background: rgb(var(--glass-tint-dark) / var(--glass-tint-alpha-dark));
    border-color: rgb(255 255 255 / 0.10);
  }
  @variant reduced-transparency {
    background: rgb(245 245 245 / 0.95);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
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

Utility-class usage (works with the `@utility` definitions above). Every actionable element carries `data-liquid-glass` — the attribute `references/refraction.md`'s drop-in `init()` scans for — because refraction is the default here, not an opt-in per element. Two surfaces skip it: the static Card, and the full-width Navbar below (background chrome, not itself a control — see the Navbar/toolbar exception above):

```html
<!-- Card: static content backdrop, no interaction -> no data-liquid-glass -->
<div class="liquid-glass p-6">...</div>

<!-- Navbar: full-width header chrome, not a control in its own right -> blur+saturate
     only, no data-liquid-glass, same as the Card. A compact app-style/floating toolbar
     or tab bar (closer to a dock than a page header) would carry data-liquid-glass instead. -->
<nav class="liquid-glass glass-hairline fixed top-0 inset-x-0 z-50 h-16 rounded-none border-x-0 border-t-0">
  ...
</nav>

<!-- Button: actionable, refraction at aberration 0 -->
<button data-liquid-glass class="liquid-glass px-5 py-2.5 rounded-full text-white font-medium
  shadow-(--shadow-glass-rim)
  transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
  hover:-translate-y-px hover:bg-white/20 active:scale-[0.97]
  focus-visible:outline-2 focus-visible:outline-[#0a84ff] focus-visible:outline-offset-2">
  Label
</button>

<!-- Modal / sheet: heavier frost. Prominent + infrequent -> a reasonable
     place to spend one of the ~2 chromatic-aberration slots per viewport. -->
<div data-liquid-glass data-liquid-glass-aberration="12" class="liquid-glass rounded-t-(--radius-glass-lg)
  backdrop-blur-(--blur-glass-xl) backdrop-saturate-200 p-6
  shadow-(--shadow-glass-lg)">
  ...
</div>

<!-- Segmented control: actionable, refraction at aberration 0 -->
<div data-liquid-glass class="liquid-glass inline-flex rounded-xl p-1">
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
  .liquid-glass { transition: none; animation: none; }
}
```

- Focus rings vanish against refracted backdrops. Use a two-tone ring: `outline: 2px solid #0a84ff; outline-offset: 2px; box-shadow: 0 0 0 4px rgb(255 255 255 / 0.9);`
- Hit targets at least 44x44px
- Hidden filter SVG: `width="0" height="0" aria-hidden="true"`

## Performance Budget

- Each `backdrop-filter` element costs a backdrop readback + offscreen GPU texture. Cost scales with element area and blur radius. Refraction adds a canvas-generated displacement map (rebuilt only on resize) plus 1 `feDisplacementMap` pass (no aberration) or 3 (with aberration).
- Refraction is the default on actionable elements now, so the ceiling applies to *chromatic aberration* specifically: **at most 2 elements with `aberration > 0` per viewport**; plain single-pass refraction (`aberration: 0`) on every other actionable control is the expected default.
- Overall hard limit regardless of refraction: **at most 5 blurred glass surfaces per viewport**, no glass-on-glass.
- Add `contain: layout paint style;` on glass elements; `isolation: isolate` on the parent.
- `will-change: transform` only on elements that actually move (never `will-change: backdrop-filter`).
- Keep glass off full-viewport scrolling surfaces on mobile. On low-end hardware or once already at the 5-surface ceiling, drop refraction before dropping blur+saturate.

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

## Provenance

The Design Semantics, Background Extension Effect, Scroll Edge Effect, and Layout Adjustments sections above are grounded in a live crawl (September 2026) of three official Apple sources, via browser automation, not training memory:

- `developer.apple.com/documentation/technologyoverviews/liquid-glass` — the material's own definition, automatic vs. custom-control adoption, cross-platform framing.
- `developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass` — migration/adoption guidance: background extension effect, scroll edge effect, custom-background removal, row height/padding, sheet insetting and opacity transitions.
- `developer.apple.com/design/human-interface-guidelines/materials` — the Regular/Clear variant rules and the 35%-opacity dimming number.

Every quoted phrase above is verbatim from those pages. Everything else (Consensus Values table, the concentric-corner formula, Tailwind implementation, refraction technique, performance budget) is this skill's own engineering derivation for reproducing Apple's stated design intent in CSS — not an Apple-published number — flagged inline wherever the distinction matters.
