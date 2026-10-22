---
id: BE-34
title: "Postmortem report"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-34 · Postmortem report

## Summary
Timeline, MTTA, MTTR, who acknowledged

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/report/PostmortemReport.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/report/PostmortemReportTest.java`

## Decisions and notes
- MTTA/MTTR from the incident timeline; summary averages per team.
- Report built from the immutable `Incident`: MTTA = opened -> acknowledged, MTTR = opened -> resolved (null while missing); timeline is the incident's event list. `Summary` means skip incidents without the measure and are null without data.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — postmortem report and summary implemented; pending tag removed (status: done).
