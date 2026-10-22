---
id: BE-43
title: "Uptime Kuma import"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-43 · Uptime Kuma import

## Summary
Maps monitors and groups

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/UptimeKumaImporter.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/UptimeKumaImporterTest.java`

## Decisions and notes
- http and keyword monitors mapped (interval, timeout, retries + 1 = downAfter, accepted status range, keyword as contains); Kuma groups become groups; passwords never imported; other types reported as skipped.
- Ids: `req_kuma_<id>` and `grp_kuma_<id>`. Interval clamped to 15 s..24 h; timeout from Kuma seconds (default 80% of the interval) clamped to 100 ms..5 min; `active: false` becomes paused; `maxredirects > 0` follows redirects; `invertKeyword` becomes `not contains`.
- Accepted status codes: one range -> `between`, one code -> `==`, several -> `in (...)` (envelope `between` above 200 codes); default 200-299.
- Headers, body and any authentication are never imported (they may carry credentials); `Result.notes` tells the operator what to add again from the vault. The importer only builds a proposal; saving goes through `MonitorDefinitions` validation.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented the Uptime Kuma backup importer (status: done).
