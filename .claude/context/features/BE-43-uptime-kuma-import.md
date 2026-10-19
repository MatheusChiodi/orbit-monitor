---
id: BE-43
title: "Uptime Kuma import"
area: backend
group: "Workspace and configuration"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-43 · Uptime Kuma import

## Summary
Maps monitors and groups

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/UptimeKumaImporter.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/UptimeKumaImporterTest.java`

## Decisions and notes
- http and keyword monitors mapped (interval, timeout, retries + 1 = downAfter, accepted status range, keyword as contains); Kuma groups become groups; passwords never imported; other types reported as skipped.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
