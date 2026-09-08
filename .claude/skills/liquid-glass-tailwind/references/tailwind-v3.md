# Tailwind v3 Equivalents

For projects still on Tailwind v3 (JS config, no `@utility`). Same values as SKILL.md, expressed with arbitrary values or a plugin.

## Inline arbitrary values (no config changes)

```html
<div class="relative isolate overflow-hidden rounded-[20px]
  bg-white/10 dark:bg-black/40
  border border-white/20 dark:border-white/10
  backdrop-blur-[16px] backdrop-saturate-[1.8] backdrop-brightness-110
  shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.40),inset_0_-1px_0_rgba(0,0,0,0.05)]
  after:content-[''] after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]
  after:bg-[linear-gradient(135deg,rgba(255,255,255,0.45),rgba(255,255,255,0.08)_28%,transparent_58%)]
  after:mix-blend-screen after:pointer-events-none">
  ...
</div>
```

Refraction opt-in requires an arbitrary property (declaration-order fallback is impossible inline, so gate it behind a class defined in CSS, or accept blur-only in non-Chromium):

```html
<div class="[backdrop-filter:blur(2px)_url(#liquid-glass-refraction)_saturate(1.8)]">
```

## theme.extend tokens

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        "glass-tint": "rgb(255 255 255 / 0.12)",
        "glass-tint-strong": "rgb(255 255 255 / 0.18)",
        "glass-tint-dark": "rgb(0 0 0 / 0.40)",
      },
      borderRadius: {
        glass: "20px",
        "glass-lg": "28px",
      },
      boxShadow: {
        glass:
          "0 8px 24px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.40), inset 0 -1px 0 rgba(0,0,0,0.05)",
        "glass-lg":
          "0 16px 48px rgba(0,0,0,0.16), 0 4px 8px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -1px 1px rgba(255,255,255,0.30)",
        "glass-rim": "inset 0 0 20px -5px rgba(255,255,255,0.70)",
      },
      backdropBlur: {
        "glass-sm": "8px",
        glass: "16px",
        "glass-lg": "24px",
        "glass-xl": "40px",
      },
    },
  },
  plugins: [
    require("tailwindcss/plugin")(({ addVariant, addUtilities }) => {
      addVariant("reduced-transparency", "@media (prefers-reduced-transparency: reduce)");
      addUtilities({
        ".liquid-glass-refract": {
          "backdrop-filter": "blur(16px) saturate(180%)",
          // Chromium keeps this second declaration, Safari/Firefox drop it:
          // (duplicate keys are impossible in JS objects, so emit via raw CSS)
        },
      });
    }),
  ],
};
```

Note: the declaration-order refraction fallback cannot be expressed through `addUtilities` (JS objects deduplicate keys). Put the two `backdrop-filter` declarations in a plain CSS file loaded after Tailwind:

```css
.liquid-glass-refract {
  backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(2px) url(#liquid-glass-refraction) saturate(180%) brightness(1.08);
}
```

## Accessibility blocks (plain CSS, load after Tailwind)

Same as SKILL.md: `prefers-reduced-transparency`, `prefers-contrast: more` (Canvas/CanvasText), `prefers-reduced-motion`. These are plain media queries; copy them verbatim.
