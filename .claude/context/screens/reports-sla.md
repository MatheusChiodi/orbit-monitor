---
screen: reports-sla
title: "SLA reports"
route: "index.html#/reports"
status: done
spec: docs/02-features.md §5, FE-43
updated: 2026-10-24
---

# SLA reports

## Purpose
Uptime per group/monitor, MTTA/MTTR, CSV/PDF export.

## Layout and components
`ReportsScreen` (coverage + per-monitor history summary queries, CSV/PDF download) → `SlaReports`.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-05 · State, hysteresis, uptime and p95](../features/CORE-05-state-hysteresis-uptime-and-p95.md) — done
- [CORE-20 · Local-first runtime](../features/CORE-20-local-first-runtime.md) — in-progress
- [FE-43 · SLA reports](../features/FE-43-sla-reports.md) — done

## Code
- `frontend/src/app/console/screens/ReportsScreen/ReportsScreen.tsx`
- `frontend/src/domains/telemetry/SlaReports/SlaReports.tsx`
- `frontend/src/domains/telemetry/SlaReports/slaPdf.ts`
- `frontend/src/domains/telemetry/SlaReports/sla.ts`

## Tests
- `frontend/src/domains/telemetry/SlaReports/SlaReports.wiring.test.tsx`
- `frontend/src/domains/telemetry/SlaReports/slaPdf.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`
- `frontend/src/domains/telemetry/SlaReports/SlaReports.layout.test.tsx`
- `frontend/src/domains/telemetry/SlaReports/SlaReports.test.tsx`

## Decisions and notes
- Redesign (FE-43): page header with description; Export CSV/PDF sit next to the period control; the group table comes first; both tables use the `Table` primitive with the same five columns (name, group or member count, Availability, Downtime, Incidents) and fixed widths so they line up; tables stack into cards under 640 px.
- Empty install shows an `EmptyState` ("Nothing to report yet"), never an empty table. The `data-partial` flag moved from the table to the wrapper of both tables.
- Strings live in the `ops` namespace (`domains/alerting/locales`).

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — route `#/reports` wired to the history API with CSV and PDF export (status: done).
- 2026-10-22 — FE-58 history range picker is the single period control, with the coverage indicator.
- 2026-10-24 — redesign: human column headers, aligned tables (groups first), export next to the range picker, empty state.
