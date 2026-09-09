<div align="center">

# liquid-glass-tailwind

*Apple's iOS 26 Liquid Glass design language for Tailwind CSS v4, with a live, tunable SVG refraction demo*

[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Node.js](https://img.shields.io/badge/Node.js->=20-3c873a?style=flat-square)](https://nodejs.org)

[Features](#features) • [Getting started](#getting-started) • [The demo](#the-demo) • [Using the skill elsewhere](#using-the-skill-elsewhere) • [Project structure](#project-structure)

</div>

This repository packages Apple's Liquid Glass material as a [Claude Code skill](.claude/skills/liquid-glass-tailwind) you can drop into any Tailwind v4 project, plus a Vite demo that proves the recipe out: a draggable glass square with real SVG refraction, chromatic aberration, and live-tunable theming, all built from the skill's own utilities.

> [!NOTE]
> True refraction (`backdrop-filter: url(#svgFilter)`) only renders in Chromium browsers. Safari and Firefox fall back to a still-convincing blur + saturate glassmorphism look, no visual breakage either way.

## Features

- **Four-layer material**: frost, tint, rim, and optional SVG refraction, matching Apple's own highlight / shadow / illumination composition.
- **Real refraction, not a filter preset**: a per-element displacement map generated from a rounded-rect signed distance field, with two lens modes (`symmetric`, `diagonal`) and optional chromatic aberration fringes.
- **Runtime theming at three levels**: every knob (tint, saturation, blur, refraction strength...) is a plain CSS custom property, so you can reconfigure the whole app from `:root`, a single subtree, or one element, without touching the utility.
- **Debugged for real**: every trap in `references/refraction.md` (filter geometry, displacement map symmetry, DOM timing, nested `var()` overrides) was hit, diagnosed, and verified fixed in a live browser, not guessed from documentation.
- **Accessible by default**: `prefers-reduced-transparency`, `prefers-contrast`, and `prefers-reduced-motion` fallbacks ship with the utility, not as an afterthought.

## Getting started

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/iMxSquash/liquid-glass-tailwind.git
cd liquid-glass-tailwind
npm install
npm run dev
```

Open the printed local URL: a glass square sits over a busy, multi-color background (a flat gradient wouldn't give the lens anything to bend). Drag it around, then use the panel in the top-right corner to tune distortion, chromatic aberration, lens mode, tint, and blur in real time.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## The demo

`index.html` / `src/` is the reference implementation of the skill's recipe:

- `src/style.css`: Tailwind v4 tokens (`@theme`) and the `liquid-glass` utility (`@utility`), covering frost, tint, and rim.
- `src/refraction.js`: the fourth layer, refraction, as a standalone module. `attachLiquidGlassRefraction(el, options)` returns a controller with `update()` and `destroy()`.
- `src/main.js`: wires up the draggable square and the tuning panel.

> [!TIP]
> Every control in the demo panel maps to a CSS custom property. The tint and blur sliders, for instance, just call `element.style.setProperty('--glass-tint-alpha', ...)`, no re-render, no framework, the cascade does the work. See "Runtime theming" in [`SKILL.md`](.claude/skills/liquid-glass-tailwind/SKILL.md) for the one rule that makes this reliable.

## Using the skill elsewhere

The skill contains:

- **`SKILL.md`**: design semantics from Apple's HIG, the Tailwind v4 token/utility recipe, component patterns (card, navbar, button, modal), the three-tier browser fallback, accessibility requirements, and a performance budget.
- **`references/refraction.md`**: the complete, verified refraction implementation (the same code `src/refraction.js` is built from), with every trap documented alongside its symptom signature so it's recognizable on sight instead of re-debugged from scratch.
- **`references/tailwind-v3.md`**: arbitrary-value equivalents for projects still on Tailwind v3.

### Install

**Manual (Claude Code), kept in sync with the repo**

```bash
git clone https://github.com/iMxSquash/liquid-glass-tailwind.git ~/liquid-glass-tailwind
mkdir -p ~/.claude/skills
ln -s ~/liquid-glass-tailwind/.claude/skills/liquid-glass-tailwind ~/.claude/skills/liquid-glass-tailwind
```

`SKILL.md` lives at `.claude/skills/liquid-glass-tailwind/` inside the repo (this repo doubles as a Tailwind demo, not just a skill), so the symlink points one level in rather than at the repo root. From then on, `git pull` in `~/liquid-glass-tailwind` is all it takes to update the skill everywhere, no resync step, no risk of the installed copy drifting from the source.

> [!WARNING]
> Removing `~/liquid-glass-tailwind` also breaks the symlink. To uninstall without touching the repo, remove only the link: `rm ~/.claude/skills/liquid-glass-tailwind`.

**Manual (Claude Code), one-time copy, no ongoing sync**

```bash
git clone https://github.com/iMxSquash/liquid-glass-tailwind.git /tmp/liquid-glass-tailwind
cp -R /tmp/liquid-glass-tailwind/.claude/skills/liquid-glass-tailwind ~/.claude/skills/
```

Start a new Claude Code session after either method to pick up the skill.

## Project structure

```
.claude/skills/liquid-glass-tailwind/   the Claude Code skill (SKILL.md + references/)
src/
  style.css        Tailwind v4 tokens + the `liquid-glass` utility (layers 1-3)
  refraction.js     layer 4: the verified SVG refraction module
  main.js           demo wiring: drag-and-drop square + live tuning controls
index.html           Tailwind v4 demo page
vite.config.js        Vite + @tailwindcss/vite plugin
```
