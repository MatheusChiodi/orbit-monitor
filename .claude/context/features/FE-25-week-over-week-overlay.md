---
id: FE-25
title: "Week-over-week overlay"
area: frontend
group: "Visualizations"
status: done
screens: [data-and-display, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-25 · Week-over-week overlay

## Summary
Same period last week drawn as a ghost line

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/weekOverWeek.ts`
- `frontend/src/shared/viz/core/TimeSeriesChart.tsx (`overlay="week-over-week"`)`

## Tests
- `frontend/src/shared/viz/weekOverWeek.test.ts`
- `frontend/src/shared/viz/LineChart/LineChart.overlay.test.tsx`

## Decisions and notes
- Needs history older than one week plus the current span; otherwise a note explains that memory covers only the last N h.
- Last week's points are matched within ±60 s; gaps stay `null` (never interpolated). Ghost line: muted, dashed, with a legend.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — implemented; tests active and green (status: done).
