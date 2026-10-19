---
id: FE-21
title: "Visualization picker"
area: frontend
group: "Visualizations"
status: done
screens: [data-and-display, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-21 · Visualization picker

## Summary
Shows the field's real data rendered in every compatible mode side by side; the user clicks the one they like

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/viz/VisualizationPicker/VisualizationPicker.tsx`
- `frontend/src/shared/viz/modes.ts (MODE_COMPONENTS registry)`

## Tests
- `frontend/src/shared/viz/VisualizationPicker/VisualizationPicker.test.tsx`

## Decisions and notes
- **Rendering library (decided 2026-10-18): hand-rolled SVG + HTML in `frontend/src/shared/viz/`, no chart library.** Compared:
  - *Recharts 3* (already a dependency): ~95–110 KiB gzip for a chart page with React externalized (TanStack Charts benchmark), SVG, accessibility left to the app; `ResponsiveContainer` needs `ResizeObserver`. Too heavy for the wall's 150 KB gzip budget when the picker renders up to 20 previews.
  - *visx*: modular primitives (`@visx/xychart` main export ~49 KB gzip), SVG, a11y entirely up to us; adds d3 deps for scales we can write in a few lines.
  - *uPlot*: smallest and fastest (canvas), ideal for 10k+ points, but canvas puts no text or roles in the DOM: state labels, `<SafeValue>` masking and screen-reader names would need a parallel DOM anyway.
  - *Own SVG/HTML*: 0 KB of dependencies, every value is real DOM text through `<SafeValue>`, roles (`img`, `meter`, `grid`, `table`, `slider`) are native, colors are theme CSS variables so custom themes recolor charts, and series are short (24 h in memory, at most a few hundred points), so SVG cost is negligible on a TV box. Matches the existing `Sparkline` / `ThresholdChart`.
- Recharts stays in `package.json` for other screens; `shared/viz` does not import it.
- Sources: https://tanstack.com/charts/latest/docs/framework/react/comparison · https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026 · https://blog.logrocket.com/top-5-react-chart-libraries/
- Pending tests moved from `domains/monitor/components/VisualizationPicker/` to `shared/viz/VisualizationPicker/` (owner: orbit-dataviz).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — pending tests moved to `shared/viz`; rendering decision recorded (own SVG, no chart library).
- 2026-10-18 — implemented: one native radio group (arrow keys skip disabled modes), every compatible mode renders the real data with `animation="off"` inside `AnimationLevelScope level="off"`, incompatible modes stay visible with their reason, PCI/LGPD reasons stated once; tests active and green (status: done).
- 2026-10-18 — visual check: compatible previews first in a large grid, incompatible modes below as a compact disabled list (same radio group).
