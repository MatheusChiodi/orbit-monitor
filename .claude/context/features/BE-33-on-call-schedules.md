---
id: BE-33
title: "On-call schedules"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-33 · On-call schedules

## Summary
Rotations; "who is on call now" for escalation and the wall clock block

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/oncall/OnCallSchedule.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/oncall/OnCallScheduleTest.java`

## Decisions and notes
- Fixed-length shifts rotating through people from `start`; overrides win; stored in orbit.oncall.json.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
