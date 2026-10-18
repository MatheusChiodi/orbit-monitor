---
id: CORE-01
title: "Gatus-style conditions"
area: backend
group: "Monitor"
status: done
screens: [monitor-editor-http, monitor-editor-sql]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-01 · Gatus-style conditions

## Summary
Parser and evaluators for `[STATUS]`, `[RESPONSE_TIME]`, `[BODY]`, `[ROWS]`, `[COL]`, `[EXEC_TIME]` with `< <= > >= == != between in older than`, WARN/DOWN levels.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md), [monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/condition/`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/condition/ConditionParserTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/condition/ConditionEngineTest.java`

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: done).
