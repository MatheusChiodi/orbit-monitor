---
id: FE-69
title: "Monitor detail actions and history chart"
area: frontend
group: "Console redesign"
status: done
screens: [monitor-list]
spec: docs/02-features.md
updated: 2026-10-24
---

# FE-69 · Monitor detail actions and history chart

## Summary
`#/monitors/:id` can change the monitor, not only show it: Edit, Pause/Resume, Duplicate and Delete in the header; a history chart with axes, the rule limit and a readout; empty stats explained.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/app/console/screens/MonitorDetailScreen/MonitorDetailScreen.tsx`
- `frontend/src/app/console/screens/MonitorDetailScreen/monitorActions.ts`
- `frontend/src/app/console/screens/MonitorHistoryPanel/MonitorHistoryPanel.tsx`
- `frontend/src/app/console/screens/MonitorHistoryPanel/historySeries.ts`
- `frontend/src/domains/telemetry/history/HistoryChart/HistoryChart.tsx`
- `frontend/src/domains/telemetry/history/HistoryChart/chartGeometry.ts`

## Tests
- `frontend/src/app/console/screens/MonitorDetailScreen/MonitorDetailScreen.test.tsx`
- `frontend/src/app/console/screens/MonitorDetailScreen/monitorActions.test.ts`
- `frontend/src/app/console/screens/MonitorHistoryPanel/historySeries.test.ts`
- `frontend/src/domains/telemetry/history/HistoryChart/HistoryChart.test.tsx`

## Decisions and notes
- Header: `PageHeader` with a back link, the state (`StatusBadge`, or a neutral "Paused" badge), the kind and "Open target" as a plain link; actions = "Acknowledge open incident" (primary, only with an open unacknowledged incident), Edit (→ `#/monitors/:id/edit`, screen by B3), Pause/Resume, and a "…" menu with Duplicate and Delete. Edit actions only for editors.
- The API has no pause endpoint: Pause/Resume re-saves the definition (`POST /api/monitors`) with `paused`, built with the edit form's own `stateFromDefinition` + `buildDefinition`, so extras and conditions the form cannot show are kept and masked secrets stay masked.
- Duplicate saves a copy named "Copy of …" (B3 `duplicateOf`: no id, no pause, masked secrets dropped) and opens it in Edit, with a toast reminding to type secret headers again.
- Delete confirms in a `Dialog` (focus on Cancel, danger "Delete monitor") and returns to the list.
- "Response time (p95)" and "Uptime" say "Not enough data yet" instead of a dash.
- History chart: inline SVG (no chart library; the canvas `ThresholdChart` has no value axis and a minutes-from-now time axis, so it does not fit a 24 h / 7 d / 30 d window). Round value ticks, 2–6 time labels (HH:mm, or dd/MM above two days), the monitor's rule limit as a dashed line with its value, gaps for missing data, and a readout that follows the pointer or arrows / Home / End. Default range stays 24 h.

## Changelog
- 2026-10-24 — context file created; detail actions, paused state, explained stats and the history chart (status: done).
