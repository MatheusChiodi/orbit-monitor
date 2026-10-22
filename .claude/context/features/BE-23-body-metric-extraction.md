---
id: BE-23
title: "Body metric extraction"
area: backend
group: "Telemetry"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-23 · Body metric extraction

## Summary
JSONPath values stored as series

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/http/MetricExtractor.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckRunner.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckResult.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/SeriesMetrics.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/http/MetricExtractorTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/CheckRunnerExtendedTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`

## Decisions and notes
- JSONPath definite paths only; numbers and numeric strings become series values.
- Jayway JSONPath (already a dependency) over one parsed document; `JsonPath.isDefinite()` rejects `[*]`, filters and deep scans; booleans, text and non-finite numbers are skipped; invalid JSON yields an empty map.
- Data protection: paths whose leaf name classifies as PCI_PAN/PCI_SAD and values containing a card number are never extracted (docs/04-data-protection.md).
- Wired 2026-10-22: HTTP fields with `storeAsSeries` and a `$...` key are extracted from the raw body at the probe boundary (`CheckRunner.runHttp(..., metricPaths)`) into `CheckResult.metrics`, then written as series points `monitorId/$.path` (history API `GET /api/history/{id}/series?field=`).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented JSONPath metric extraction (status: done).
- 2026-10-22 — metric extraction used by HTTP and multi-step checks; values reach the series history.
