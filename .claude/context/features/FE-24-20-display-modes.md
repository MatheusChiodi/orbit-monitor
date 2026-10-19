---
id: FE-24
title: "20 display modes"
area: frontend
group: "Visualizations"
status: done
screens: [data-and-display, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-24 · 20 display modes

## Summary
See §1.1

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/index.ts and modes.ts (public API, `MODE_COMPONENTS`)`
- `frontend/src/shared/viz/types.ts`
- `frontend/src/shared/viz/core/ (VizFrame, TimeSeriesChart, HeatGrid, series geometry, palette, format, useVizLevel)`
- `frontend/src/shared/viz/<Mode>/<Mode>.tsx for the 20 modes: BigNumber, RadialGauge, BulletChart, HeadroomBar, KpiCard, LineChart, AreaChart, StepLine, BarRanking, StackedBar, Donut, WeekdayHourHeatmap, CalendarHeatmap, UptimeRibbon, TrafficLight, TextStatus, LiveTable, SmallMultiples, Histogram, HexGrid`
- `frontend/src/shared/viz/VizGallery/` (dev-only gallery: `gallery.html`, served by `vite` at `/src/shared/viz/VizGallery/gallery.html`, not a build input)

## Tests
- `frontend/src/shared/viz/<Mode>/<Mode>.test.tsx (20 suites)`
- `frontend/src/shared/viz/core/core.test.ts`

## Decisions and notes
- One folder per mode under `shared/viz/`; all modes share `VizFrame` (label through `<SafeValue>`, state pill as text, empty state, history notice) and one `VizData` type, so the picker hands the same field data to every mode.
- `animation` prop per mode, resolved by `useVizLevel` (prop, else app level; `prefers-reduced-motion` forces `off`) and exposed as `data-animation`; the subtree is scoped with `AnimationLevelScope` so shared parts follow it. Marks animate only transform/opacity/colors (`markTransition`), values flash via `FlashValue`, frames enter with the FE-51 `enter` preset.
- Colors: status tokens for state; categorical `--viz-1..8` CSS variables (fallback: dataviz reference palette, dark steps) validated on `--s1` #0d1117: all checks pass, worst adjacent CVD ΔE 8.4, normal-vision ΔE 19.3, all at least 3:1. Custom themes override the variables.
- Time axes show only first/last time; the crosshair readout carries exact times.
- Tests moved from `domains/telemetry/visualizations/` to `shared/viz/` (owner: orbit-dataviz).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — modes 1–8 implemented in `shared/viz` with shared frame and time-series renderer; tests for 1–8 active (status: in-progress).
- 2026-10-18 — modes 9–20 implemented (heatmaps as ARIA grids with hatched no-data cells, donut folds to 5 + Other, hex grid problems first, live table flags rows in text); all 20 suites active and green (status: done).
- 2026-10-18 — visual check in headless Chrome (en, pt-BR): bullet bands made neutral (value bar alone carries state), calendar cells capped and dates numeric, headroom value/rule wrap instead of truncating; dev gallery added.
