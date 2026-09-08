# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-08

### Added

- Liquid Glass Tailwind CSS v4 skill (`.claude/skills/liquid-glass-tailwind`): design semantics from Apple's HIG, the `@theme`/`@utility` token recipe, three-tier browser fallback, accessibility requirements, and a performance budget.
- Verified SVG refraction reference (`references/refraction.md`): canvas-generated signed-distance-field displacement maps, two lens modes (`symmetric`, `diagonal`), optional chromatic aberration, and every trap hit and fixed along the way (filter geometry, displacement map symmetry, DOM timing, nested `var()` overrides).
- Tailwind v3 arbitrary-value reference (`references/tailwind-v3.md`).
- Runtime theming: every knob (tint, saturation, brightness, blur, refraction strength) is a plain CSS custom property, overridable globally, per subtree, or per element.
- Vite + Tailwind v4 demo (`index.html`, `src/`) reproducing the effect live: a draggable glass square with tunable distortion, chromatic aberration, lens mode, tint, and blur.

[1.0.0]: https://github.com/iMxSquash/liquid-glass-tailwind/releases/tag/v1.0.0
