---
id: FE-24
title: "20 display modes"
area: frontend
group: "Visualizations"
status: in-progress
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
- [ ] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/types.ts`
- `frontend/src/shared/viz/core/ (VizFrame, TimeSeriesChart, series geometry, palette, format, useVizLevel)`
- `frontend/src/shared/viz/BigNumber/BigNumber.tsx`
- `frontend/src/shared/viz/RadialGauge/RadialGauge.tsx`
- `frontend/src/shared/viz/BulletChart/BulletChart.tsx`
- `frontend/src/shared/viz/HeadroomBar/HeadroomBar.tsx`
- `frontend/src/shared/viz/KpiCard/KpiCard.tsx`
- `frontend/src/shared/viz/LineChart/LineChart.tsx`
- `frontend/src/shared/viz/AreaChart/AreaChart.tsx`
- `frontend/src/shared/viz/StepLine/StepLine.tsx`

## Tests
- `frontend/src/shared/viz/<Mode>/<Mode>.test.tsx (modes 1–8 active)`
- `frontend/src/shared/viz/<Mode>/<Mode>.pending.test.tsx (modes 9–20)`

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
