---
id: FE-23
title: "Visualization settings"
area: frontend
group: "Visualizations"
status: in-progress
screens: [data-and-display, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-23 · Visualization settings

## Summary
Color bands, decimals, prefix/suffix, min/max, threshold line, what to show when a rule fails

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/settings.ts`

## Tests
- `frontend/src/shared/viz/settings.test.ts`
- `frontend/src/shared/viz/VisualizationSettings/VisualizationSettings.pending.test.tsx`

## Decisions and notes
- Bands use inclusive `from`, exclusive `to`, so "< 50" and "50–200" touch without overlapping.
- `applySettings` redacts text values and the prefix/suffix too, so an affix cannot smuggle a card number.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — pure settings (`bandStatus`, `validateSettings`, `applySettings`) implemented; component pending (status: in-progress).
