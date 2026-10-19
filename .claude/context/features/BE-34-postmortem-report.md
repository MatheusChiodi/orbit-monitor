---
id: BE-34
title: "Postmortem report"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-34 · Postmortem report

## Summary
Timeline, MTTA, MTTR, who acknowledged

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/report/PostmortemReport.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/report/PostmortemReportTest.java`

## Decisions and notes
- MTTA/MTTR from the incident timeline; summary averages per team.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
