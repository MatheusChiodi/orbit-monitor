---
id: FE-26
title: "Chart annotations"
area: frontend
group: "Visualizations"
status: done
screens: [data-and-display, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-26 · Chart annotations

## Summary
Incidents, maintenance windows and deploy markers on time charts

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/annotations.ts`
- `frontend/src/shared/viz/ChartAnnotations/ChartAnnotations.tsx`

## Tests
- `frontend/src/shared/viz/annotations.test.ts`
- `frontend/src/shared/viz/ChartAnnotations/ChartAnnotations.test.tsx`

## Decisions and notes
- Maintenance windows are bands, incidents/deploys are lines; each has a button marker with kind and time as its name and a glyph, so kind is never color-only. Titles are redacted.
- Test fixed to use local times throughout (it mixed local and UTC and failed outside UTC).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — implemented; tests active and green (status: done).
