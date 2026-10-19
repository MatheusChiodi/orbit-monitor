---
id: FE-43
title: "SLA reports"
area: frontend
group: "Console productivity"
status: in-progress
screens: [reports-sla]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-43 · SLA reports

## Summary
Uptime per group/monitor, CSV/PDF export

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[reports-sla](../screens/reports-sla.md)

## Code
- `frontend/src/domains/telemetry/SlaReports/SlaReports.tsx`
- `frontend/src/domains/telemetry/SlaReports/sla.ts`

## Tests
- `frontend/src/domains/telemetry/SlaReports/SlaReports.test.tsx`

## Decisions and notes
- Uptime excludes maintenance and shows no number without measurements; periods longer than the in-memory window are flagged partial (never shown as complete); the CSV header states the history window and names are redacted.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — SLA reports component (status: in-progress).
