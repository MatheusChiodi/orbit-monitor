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
- `backend/orbit-api/src/main/java/io/orbit/api/web/OnCallController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/escalation/EscalationRunner.java`
- `backend/orbit-config/src/main/resources/schemas/orbit.oncall.schema.json`
- `backend/config-examples/orbit.oncall.example.json`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/oncall/OnCallScheduleTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/OnCallApiTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/escalation/EscalationRunnerTest.java`

## Decisions and notes
- Fixed-length shifts rotating through people from `start`; overrides win; stored in orbit.oncall.json.
- Shift index = floor((now - start) / shift) modulo the number of people; overrides are half-open `[from, until)` and win over the rotation (first match). `shiftEndsAt` returns the override end while one is active. Lists are copied defensively; a non-positive shift is rejected.
- Alternative considered: RFC 5545 RRULE-based rotations (ical4j); fixed-length shifts cover the spec without a dependency.
- `orbit.oncall.json` items `{id, name, people[], start, shift (ISO-8601 duration), overrides[{person, from, until}]}`, schema-checked; `problems()` (no people, no start, override ending before it starts) makes the file invalid (422).
- Escalation (BE-27): a step may carry `onCallScheduleId`; the runner resolves the person on call at send time and the message adds "On call: <name>" (masked). The upcoming step also carries `onCall`.
- REST: `GET /api/oncall` -> `[{id, name, people, start, shiftHours, overrides, onCallNow, shiftEndsAt}]`; `GET /api/oncall/now` -> `[{scheduleId, name, person, shiftEndsAt}]` (schedules with someone on call; used by the wall clock/on-call block and FE-49); `PUT /api/oncall/{id} {name, people[], start, shiftHours (1..744, default 24), overrides?}`; `DELETE /api/oncall/{id}`. Audited as `oncall.save|delete`.
- People are self-declared display names (like operator names); they live only in the local config file.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — rotation, overrides and shift end implemented; pending tag removed (status: done).
- 2026-10-22 — orbit.oncall.json store and API with "who is on call now"; used by escalation steps (status: done).
