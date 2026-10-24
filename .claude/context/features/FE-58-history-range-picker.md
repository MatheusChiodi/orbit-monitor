---
id: FE-58
title: "History range picker and coverage"
area: frontend
group: "History"
status: done
screens: [wall, reports-sla, incident-detail]
spec: docs/08-logs-and-history.md
updated: 2026-10-24
---

# FE-58 · History range picker and coverage

## Summary
24 h / 7 d / 30 d / custom range picker and a coverage indicator in charts, SLA and incident pages.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/domains/telemetry/history/range.ts` — presets, custom validation (ordered, past start, ≤ 31 days, end clamped to now), `resolutionFor` (same rule as the backend), `rangeCoverage`, datetime-local helpers
- `frontend/src/domains/telemetry/history/historyApi.ts` — `fetchCoverage`, `fetchHistory`, `historyUrl`, `useHistoryCoverage` (TanStack Query) and response types of BE-52
- `frontend/src/domains/telemetry/history/HistoryRangePicker/HistoryRangePicker.tsx`
- `frontend/src/domains/telemetry/history/CoverageIndicator/CoverageIndicator.tsx`
- `frontend/src/domains/telemetry/history/locales/en.json`, `pt-BR.json` (registered as `historyRange` in `frontend/src/shared/i18n/i18n.ts`)
- `frontend/src/domains/wall/components/SeriesBlock/SeriesBlock.tsx`
- `frontend/src/domains/workspace/BlockSettings/BlockSettings.tsx`
- `frontend/src/app/console/screens/ReportsScreen/ReportsScreen.tsx`
- `frontend/src/domains/telemetry/SlaReports/SlaReports.tsx`
- `frontend/src/app/console/screens/MonitorHistoryPanel/MonitorHistoryPanel.tsx`
- `frontend/src/app/console/screens/MonitorHistoryPanel/historySeries.ts`
- `frontend/src/app/console/screens/IncidentScreen/incidentWindow.ts`
- `frontend/src/shared/api/consoleEndpoints.ts`

## Tests
- `frontend/src/domains/telemetry/history/range.test.ts`
- `frontend/src/domains/telemetry/history/HistoryRangePicker/HistoryRangePicker.test.tsx`
- `frontend/src/domains/telemetry/history/CoverageIndicator/CoverageIndicator.test.tsx`
- `frontend/src/domains/wall/components/LayoutGrid/LayoutGrid.test.tsx`
- `frontend/src/domains/telemetry/SlaReports/SlaReports.range.test.tsx`
- `frontend/src/app/console/screens/MonitorHistoryPanel/historySeries.test.ts`
- `frontend/src/app/console/screens/IncidentScreen/incidentWindow.test.ts`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`

## Decisions and notes
- **Native `<input type="datetime-local">` for the custom period instead of a calendar library** (react-day-picker, react-datepicker): zero bundle cost, native keyboard and screen-reader support and mobile pickers; the period is short (≤ 31 days) and presets cover the common cases, so a calendar grid adds little. Two labelled inputs + Apply; errors are announced with `role="alert"`. Sources: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local · https://blog.openreplay.com/custom-date-picker/
- Presets follow the WAI-ARIA radio group pattern (one tab stop, arrow keys move and select, `aria-checked`): https://www.w3.org/WAI/ARIA/apg/patterns/radio/
- Coverage text: "History available: last N days" from `GET /api/history/coverage`; when the period starts before the oldest stored data it adds "Covers X% of this period, since …" and a `role="meter"`; low-disk mode adds "only summaries are being recorded".
- Uses its own `fetch` helpers instead of extending `shared/api/client.ts` (owned by orbit-frontend). The CORE-20 in-memory helpers (`historyCoverage`, `clampPeriod`, `HistoryNotice`) stay as they are; screens can switch to `CoverageIndicator` once they read from the 30-day store.
- Motion: no animation of its own; buttons use the shared `Button`, which follows the animation level (FE-06).
- Wall: series blocks with a `range` (24h/7d/30d, chosen in the layout editor) load `GET /api/history/{id}` with the backend resolution rule, draw it and show `CoverageIndicator`; history code loads on demand; BE-41 persists the block `range`.
- SLA screen (FE-43): the picker is the only period control (SlaReports takes it through `controls`, the old 24 h/7 d/30 d radios stay only for standalone use) and `CoverageIndicator` replaces the in-memory notice; custom ranges up to 31 days drive the summaries.
- Incident page and monitor detail: `MonitorHistoryPanel` (picker, coverage, chart of the reading or latency, DOWN share) over `GET /api/history/{id}`; an incident opens one hour before it started until one hour after it resolved (or now), capped at 31 days.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — range picker, coverage indicator, range logic and BE-52 API helpers with tests, en + pt-BR (status: in-progress until placed on the screens).
- 2026-10-22 — history window on wall series blocks with coverage indicator.
- 2026-10-22 — wall series range persisted by BE-41; SLA/incident placement still open.
- 2026-10-22 — picker and coverage indicator placed on the SLA screen (one control), the incident page and the monitor detail (status: done).
- 2026-10-24 — the history panel draws an SVG chart with value and time axes, the rule limit and a readout (FE-69) instead of the sparkline; range picker moved next to the title.
- 2026-10-24 — presets use the SegmentedControl primitive; custom range with Field/TextInput.
