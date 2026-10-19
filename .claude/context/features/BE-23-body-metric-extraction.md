---
id: BE-23
title: "Body metric extraction"
area: backend
group: "Telemetry"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-23 · Body metric extraction

## Summary
JSONPath values stored as series

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/http/MetricExtractor.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/http/MetricExtractorTest.java`

## Decisions and notes
- JSONPath definite paths only; numbers and numeric strings become series values.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
