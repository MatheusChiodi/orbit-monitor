---
id: BE-17
title: "Execution windows"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-17 · Execution windows

## Summary
Business hours/weekdays, timezone-aware

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/ExecutionWindow.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/ExecutionWindowTest.java`

## Decisions and notes
- Days + local time range in a zone; end exclusive; ranges may cross midnight.
- `java.time` only; start inclusive, end exclusive, equal start and end is the whole day; for an overnight window the day that counts is the day the window started.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented timezone-aware windows, including across midnight (status: done).
