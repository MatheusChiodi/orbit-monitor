---
id: FE-22
title: "Compatibility rules"
area: frontend
group: "Visualizations"
status: done
screens: [data-and-display, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-22 · Compatibility rules

## Summary
Only modes compatible with the data shape are enabled; the best one is suggested

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/compatibility.ts`

## Tests
- `frontend/src/shared/viz/compatibility.test.ts`

## Decisions and notes
- `dataShape()` describes the data independently of any mode; each mode has one requirement and a translatable reason (`viz.reasons.*`).
- Privacy first: card data never feeds series modes and nothing PCI/personal is offered on the wall (`privacyReason`).
- `suggestMode()` picks the most specific mode (monitors, rows, segments, samples, cells/days, categories, items, numeric rule, target, min/max, series, value, text, status) and always returns a compatible one.
- An explicit `value: null` means "no reading": the frame status alone is not data.
- Heatmaps from a raw series need history: calendar at least 48 h, hour × weekday at least 7 d (memory keeps 24 h by default).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — implemented in `shared/viz/compatibility.ts`; tests active and green (status: done).
