---
id: BE-31
title: "Maintenance windows"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-31 · Maintenance windows

## Summary
One-off and recurring (cron), silence and exclude from uptime

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/MaintenanceWindow.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/MaintenanceWindowTest.java`

## Decisions and notes
- One-off start/end or 5-field cron + duration in a zone; covers monitor or group ids; stored in orbit.maintenance.json.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
