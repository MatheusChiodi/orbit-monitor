---
id: CORE-14
title: "Monitor state severity"
area: backend
group: "Common"
status: done
screens: []
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-14 · Monitor state severity

## Summary
`MonitorState` OK/WARN/DOWN with severity ordering.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-common/src/main/java/io/orbit/common/MonitorState.java`

## Tests
- `backend/orbit-common/src/test/java/io/orbit/common/MonitorStateTest.java`

## Decisions and notes
- Order OK < UNKNOWN < WARN < DOWN; UNKNOWN means no data yet and is exposed to the wall as status `UNKNOWN`.
- `worstOf` of an empty collection is UNKNOWN (used for groups without data).

## Changelog
- 2026-10-18 — context file created (status: done).
- 2026-10-18 — notes synced.
