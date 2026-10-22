---
id: BE-33
title: "On-call schedules"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-33 · On-call schedules

## Summary
Rotations; "who is on call now" for escalation and the wall clock block

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/oncall/OnCallSchedule.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/oncall/OnCallScheduleTest.java`

## Decisions and notes
- Fixed-length shifts rotating through people from `start`; overrides win; stored in orbit.oncall.json.
- Shift index = floor((now - start) / shift) modulo the number of people; overrides are half-open `[from, until)` and win over the rotation (first match). `shiftEndsAt` returns the override end while one is active. Lists are copied defensively; a non-positive shift is rejected.
- Alternative considered: RFC 5545 RRULE-based rotations (ical4j); fixed-length shifts cover the spec without a dependency.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — rotation, overrides and shift end implemented; pending tag removed (status: done).
