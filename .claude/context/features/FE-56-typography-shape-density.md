---
id: FE-56
title: "Typography, shape and density settings"
area: frontend
group: "Customization"
status: done
screens: [settings, preferences]
spec: docs/07-customization.md
updated: 2026-10-22
---

# FE-56 · Typography, shape and density settings

## Summary
Fonts, base size, scale, weights, radius, borders, glass, surface levels, spacing and density.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/shared/customization/definitions/appearance.ts`
- `frontend/src/shared/customization/appearance.ts`
- `frontend/src/shared/customization/useAppearance.ts`
- `frontend/src/shared/customization/customization.css`

## Tests
- `frontend/src/shared/customization/appearance.test.ts`
- `frontend/src/app/console/ConsoleApp.customization.test.tsx`
- `frontend/src/domains/customization/WallCustomization/WallCustomization.test.tsx`

## Decisions and notes
- Settings: body / heading / value font (bundled `@fontsource` families or system stacks; nothing fetched at runtime), base size (13–20 px, never below the 13 px floor), text scale (0.9–1.4×, console floor kept with `max(13px, …)`, wall keeps its 12 px clamp), weight, letter spacing, monospaced values, corner radius, border width, glass, surface levels, shadows (off by default), panel padding and density.
- Applied as `data-*` attributes and CSS variables on `<html>` only when a value differs from the default, so the product look is untouched otherwise; `customization.css` overrides the existing Tailwind classes by attribute selector.
- Density bridges to FE-07/FE-50 (`applyDensity`); the console applies the resolved look right after the preference effects so layout/workspace values are not overwritten. Animation level bridges to FE-06/FE-50 and reduced motion still wins.
- Also shown in the generated Settings UI (Typography, Shape and surface, Density, Motion categories).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-22 — typography, shape and density settings applied on console and wall (status: done).
