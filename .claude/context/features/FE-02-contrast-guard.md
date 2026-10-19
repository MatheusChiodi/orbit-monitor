---
id: FE-02
title: "Contrast guard"
area: frontend
group: "Theming and personalization"
status: done
screens: [theme-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-02 · Contrast guard

## Summary
Checks WCAG 4.5:1 (body) and 3:1 (large labels) for every text/surface pair; status colors must be distinguishable; suggests a fixed value

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[theme-editor](../screens/theme-editor.md)

## Code
- `frontend/src/shared/theme/color.ts`
- `frontend/src/shared/theme/contrast.ts`

## Tests
- `frontend/src/shared/theme/color.test.ts`
- `frontend/src/shared/theme/contrast.test.ts`
- `frontend/src/shared/theme/registry.test.ts (every built-in theme passes)`

## Decisions and notes
- Library choice: compared culori (MIT, ~30 KB, full CSS Color 4) and colorjs.io (MIT, WCAG/APCA/ΔE, larger); both cover far more than needed. Chose ~200 lines of dependency-free code (WCAG 2.x luminance, OKLab, Machado 2009 matrices): zero bundle cost, no supply-chain surface, easy to audit. Sources: https://www.pkgpulse.com/blog/culori-vs-chroma-js-vs-tinycolor2-color-manipulation-javascript-2026, https://colorjs.io, https://colour.readthedocs.io/en/latest/colour.blindness.html.
- Pairs: text on bg/s1/s2/s3 and muted on bg/s1/s2 need 4.5:1; dim, ok/warn/down/info and accent on bg/s1(/s2) need 3:1 (WCAG 1.4.3 large text, 1.4.11 non-text); chart series 3:1 on s1; SQL syntax 4.5:1 on s1 (comment 3:1).
- Distinguishability: ΔE_OK between status colors ≥ 0.12 (typical vision) and ≥ 0.04 under each simulated dichromacy (Machado, Oliveira & Fernandes 2009, severity 1, applied in linear RGB as the colorspace docs recommend). Orbit Dark's worst CVD pair is 0.046 (ok/warn, protanopia), so 0.04 is the floor; states always add text + icon. Color-blind safe themes must keep ≥ 0.10 for their `cvdTarget`.
- Fixes: `suggestReadable` moves OKLab lightness with the hue kept (binary search), falling back to mixing with white/black. `fixTheme` never touches surfaces; status clashes are solved by the smallest ΔE move (lightness ±0.3, hue ±32°) of either color of the pair.
- Issue messages are i18n `Message`s (`theme.contrast.*`), so pure code stays locale-free.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — implemented (WCAG ratios, OKLab ΔE, CVD simulation, fixTheme); tests moved to src/shared/theme (status: done).
