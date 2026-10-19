---
id: FE-27
title: "Zoom and synced crosshair"
area: frontend
group: "Visualizations"
status: done
screens: [data-and-display, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-27 · Zoom and synced crosshair

## Summary
Brush to zoom; crosshair synced across charts of the same page

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/chartSync.ts`
- `frontend/src/shared/viz/ZoomBrush/ZoomBrush.tsx`
- `frontend/src/shared/viz/core/TimeSeriesChart.tsx (crosshair, `syncGroup`, `zoomable`)`

## Tests
- `frontend/src/shared/viz/chartSync.test.ts`
- `frontend/src/shared/viz/ZoomBrush/ZoomBrush.test.tsx`
- `frontend/src/shared/viz/LineChart/LineChart.crosshair.test.tsx`

## Decisions and notes
- Zustand vanilla store keyed by group; charts default to a shared store (`chartSync`).
- Keyboard first: arrows move the crosshair (Home/End jump, Escape hides); readout is a polite live region `time · value`. Brush handles are `slider`s moving 5 min (PageUp/Down 30 min), min span 5 min, clamped to the in-memory history.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — implemented; tests active and green (status: done).
