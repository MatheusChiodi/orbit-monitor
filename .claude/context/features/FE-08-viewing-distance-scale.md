---
id: FE-08
title: "Viewing distance scale"
area: frontend
group: "Theming and personalization"
status: done
screens: [preferences, wall]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-08 · Viewing distance scale

## Summary
Wall font presets for 2 m / 3 m / 5 m on top of the fluid base

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/preferences/viewingDistance.ts`
- `frontend/src/domains/wall/display/viewingScale.ts`
- `frontend/src/app/theme.css` (`html.wall` multiplies the fluid base by `--wall-scale`)
- `frontend/src/app/wall-main.tsx` (`?scale=` → device preference → 3 m)

## Tests
- `frontend/src/domains/wall/display/viewingScale.test.ts`

## Decisions and notes
- Presets 2 m = 0.85, 3 m = 1 (design reference), 5 m = 1.35, applied as `clamp(12px, calc((.7vw + .45vh) * var(--wall-scale)), 36px)` so the 12 px floor and 36 px cap always hold.
- Below 1100 px or at ≥ 4:3 the wall keeps its fixed 14 px font (one-column layout); the preset only affects the TV layout.
- Precedence: `?scale=` in the URL (TVs) → FE-50 device preference → 3 m. Unknown URL values fall back to 3 m.
- Distance ids live in `shared/preferences/viewingDistance.ts` so the preferences model does not import the wall domain; `viewingScale.ts` re-exports them.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-22 — implemented viewing distance presets, `?scale=` and wall wiring (status: done).
