---
id: FE-58
title: "History range picker and coverage"
area: frontend
group: "History"
status: in-progress
screens: [wall, reports-sla, incident-detail]
spec: docs/08-logs-and-history.md
updated: 2026-10-22
---

# FE-58 · History range picker and coverage

## Summary
24 h / 7 d / 30 d / custom range picker and a coverage indicator in charts, SLA and incident pages.

## Status
- [x] Tests written (pending or active)
- [x] Implemented (components, range logic and API helpers; placing them on the chart, SLA and incident screens is left to the screen owners)
- [x] All tests green, none pending

## Code
- `frontend/src/domains/telemetry/history/range.ts` — presets, custom validation (ordered, past start, ≤ 31 days, end clamped to now), `resolutionFor` (same rule as the backend), `rangeCoverage`, datetime-local helpers
- `frontend/src/domains/telemetry/history/historyApi.ts` — `fetchCoverage`, `fetchHistory`, `historyUrl`, `useHistoryCoverage` (TanStack Query) and response types of BE-52
- `frontend/src/domains/telemetry/history/HistoryRangePicker/HistoryRangePicker.tsx`
- `frontend/src/domains/telemetry/history/CoverageIndicator/CoverageIndicator.tsx`
- `frontend/src/domains/telemetry/history/locales/en.json`, `pt-BR.json` (registered as `historyRange` in `frontend/src/shared/i18n/i18n.ts`)
- `frontend/src/domains/wall/components/SeriesBlock/SeriesBlock.tsx`
- `frontend/src/domains/workspace/BlockSettings/BlockSettings.tsx`

## Tests
- `frontend/src/domains/telemetry/history/range.test.ts`
- `frontend/src/domains/telemetry/history/HistoryRangePicker/HistoryRangePicker.test.tsx`
- `frontend/src/domains/telemetry/history/CoverageIndicator/CoverageIndicator.test.tsx`
- `frontend/src/domains/wall/components/LayoutGrid/LayoutGrid.test.tsx`

## Decisions and notes
- **Native `<input type="datetime-local">` for the custom period instead of a calendar library** (react-day-picker, react-datepicker): zero bundle cost, native keyboard and screen-reader support and mobile pickers; the period is short (≤ 31 days) and presets cover the common cases, so a calendar grid adds little. Two labelled inputs + Apply; errors are announced with `role="alert"`. Sources: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local · https://blog.openreplay.com/custom-date-picker/
- Presets follow the WAI-ARIA radio group pattern (one tab stop, arrow keys move and select, `aria-checked`): https://www.w3.org/WAI/ARIA/apg/patterns/radio/
- Coverage text: "History available: last N days" from `GET /api/history/coverage`; when the period starts before the oldest stored data it adds "Covers X% of this period, since …" and a `role="meter"`; low-disk mode adds "only summaries are being recorded".
- Uses its own `fetch` helpers instead of extending `shared/api/client.ts` (owned by orbit-frontend). The CORE-20 in-memory helpers (`historyCoverage`, `clampPeriod`, `HistoryNotice`) stay as they are; screens can switch to `CoverageIndicator` once they read from the 30-day store.
- Motion: no animation of its own; buttons use the shared `Button`, which follows the animation level (FE-06).
- Wall: series blocks with a `range` (24h/7d/30d, chosen in the layout editor) load `GET /api/history/{id}` with the backend resolution rule, draw it and show `CoverageIndicator`; history code loads on demand. Remaining: BE-41 must persist block `range`; the SLA and incident screens (fe-console) still have to place the picker.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — range picker, coverage indicator, range logic and BE-52 API helpers with tests, en + pt-BR (status: in-progress until placed on the screens).
- 2026-10-22 — history window on wall series blocks with coverage indicator.
