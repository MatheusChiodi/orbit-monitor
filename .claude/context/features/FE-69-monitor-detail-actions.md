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
- Pause/Resume, Duplicate and Run now call `POST /api/monitors/{id}/pause|resume|duplicate|run`; the definition is never re-sent, so secrets never leave the server. Duplicate (server copies secrets, "<name> (copy)") opens the copy in Edit.
- "…" menu: Run now, Duplicate, Silence alerts…, Delete. Export CSV (`GET /api/history/{id}/export`, live mode only) sits next to the range picker; Events lists the last 20 entries of the history event log.
- Delete confirms in a `Dialog` (focus on Cancel, danger "Delete monitor") and returns to the list.
- "Response time (p95)" and "Uptime" say "Not enough data yet" instead of a dash.
- History chart: inline SVG (no chart library; the canvas `ThresholdChart` has no value axis and a minutes-from-now time axis, so it does not fit a 24 h / 7 d / 30 d window). Round value ticks, 2–6 time labels (HH:mm, or dd/MM above two days), the monitor's rule limit as a dashed line with its value, gaps for missing data, and a readout that follows the pointer or arrows / Home / End. Default range stays 24 h.

## Changelog
- 2026-10-24 — context file created; detail actions, paused state, explained stats and the history chart (status: done).
- 2026-10-24 — pause/resume/duplicate/run use the b7 endpoints (`/pause`, `/resume`, `/duplicate`, `/run`) through `useMonitorActions`, shared with the list rows; Silence alerts… (SilenceDialog), active silence with Lift, Export CSV of the shown period, Events list (`GET /api/events?monitorId`); palette actions toggle-pause, run, delete.
