---
id: FE-43
title: "SLA reports"
area: frontend
group: "Console productivity"
status: done
screens: [reports-sla]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-43 · SLA reports

## Summary
Uptime per group/monitor, CSV/PDF export

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[reports-sla](../screens/reports-sla.md)

## Code
- `frontend/src/domains/telemetry/SlaReports/SlaReports.tsx`
- `frontend/src/domains/telemetry/SlaReports/sla.ts`
- `frontend/src/domains/telemetry/SlaReports/slaPdf.ts`
- `frontend/src/app/console/screens/ReportsScreen/ReportsScreen.tsx`
- `frontend/src/app/console/screens/ReportsScreen/slaRows.ts`
- `frontend/src/app/console/download.ts`

## Tests
- `frontend/src/domains/telemetry/SlaReports/SlaReports.test.tsx`
- `frontend/src/domains/telemetry/SlaReports/slaPdf.test.ts`
- `frontend/src/domains/telemetry/SlaReports/SlaReports.wiring.test.tsx`
- `frontend/src/app/console/screens/ReportsScreen/slaRows.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`
- `frontend/src/domains/telemetry/SlaReports/SlaReports.groups.test.tsx`

## Decisions and notes
- Uptime excludes maintenance and shows no number without measurements; periods longer than the in-memory window are flagged partial (never shown as complete); the CSV header states the history window and names are redacted.
- Route `#/reports`: coverage from `GET /api/history/coverage`, one `GET /api/history/{id}/summary?from&to` per monitor for the chosen period (controlled `period` prop); down time = down share of samples × span; incidents counted in the range. `windowHours` follows the history store retention (30 d) instead of the old fixed 24 h.
- PDF export: an in-house PDF 1.4 writer (Helvetica, WinAnsi, A4, ~90 lines) instead of jsPDF (MIT, ~350 KB) or pdf-lib (MIT, ~500 KB) — the report is a text table, so a dependency is not worth it; names go through `safeText` exactly like the CSV and characters outside WinAnsi become `?`.
- Per group: `groupSla` = mean uptime of the measured members, summed downtime and incidents; shown as "Uptime by group" and included in the CSV (`scope,group,…` section) and the PDF.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — SLA reports component (status: in-progress).
- 2026-10-22 — `#/reports` wired to the history API, period-driven fetch and redacted PDF export (status: done).
- 2026-10-22 — uptime per group in the screen, CSV and PDF.
