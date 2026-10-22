---
screen: reports-sla
title: "SLA reports"
route: "index.html#/reports"
status: done
spec: docs/02-features.md §5, FE-43
updated: 2026-10-22
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

## Tests
- `frontend/src/domains/telemetry/SlaReports/SlaReports.wiring.test.tsx`
- `frontend/src/domains/telemetry/SlaReports/slaPdf.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — route `#/reports` wired to the history API with CSV and PDF export (status: done).
- 2026-10-22 — FE-58 history range picker is the single period control, with the coverage indicator.
