---
id: BE-29
title: "Deduplication"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-29 · Deduplication

## Summary
Equal alerts grouped in a 5-min window

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/AlertDeduplicator.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/AlertDeduplicatorTest.java`

## Decisions and notes
- Key = monitor|severity|channel; first alert in a 5-min window is sent, the rest are counted.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
