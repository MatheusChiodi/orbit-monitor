---
id: BE-06
title: "HTTP keyword/regex match"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-06 · HTTP keyword/regex match

## Summary
Body contains / does not contain / regex

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/condition/ConditionParser.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/condition/KeywordRegexConditionTest.java`

## Decisions and notes
- New operators `not contains` and `matches` (regex validated at save time, evaluation time-bounded against catastrophic backtracking).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
