---
id: FE-07
title: "Density"
area: frontend
group: "Theming and personalization"
status: done
screens: [preferences, wall]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-07 · Density

## Summary
`compact`, `comfortable`, `spacious` in the console

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/preferences/density.ts`
- `frontend/src/app/theme.css` (`html.console` font size from `--density-font`)
- `frontend/src/app/console/usePreferenceEffects.ts` (applies the device density)

## Tests
- `frontend/src/shared/preferences/density.test.ts`
- `frontend/src/app/console/ConsoleApp.preferences.test.tsx`

## Decisions and notes
- Three presets with a spacing scale (`--density-scale`: 0.85 / 1 / 1.15) and a console font size (`--density-font`: 14 / 15 / 16 px); comfortable keeps the original 15 px.
- `applyDensity` marks `<html data-density>` so CSS can target a density; 2.2 rem buttons × 0.85 stay ≥ 1.85 rem (touch/click target).
- No library needed: CSS custom properties on the root are the lightest option and survive theme switches; alternatives considered were Tailwind variants per density (more classes, no runtime change) and a React context (re-renders every component).
- The density comes from the FE-50 preferences store (device choice → workspace default → comfortable).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-22 — implemented density presets, CSS variables and console wiring (status: done).
