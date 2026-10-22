---
id: BE-27
title: "Escalation policies"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-27 · Escalation policies

## Summary
Timed steps, stop on acknowledge

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/escalation/EscalationPolicy.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/escalation/EscalationRunner.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/NotificationDispatcher.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/EscalationController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/IncidentController.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/escalation/EscalationPolicyTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/escalation/EscalationRunnerTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/NotificationDispatcherTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AlertingApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallViewFactoryTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/OnCallApiTest.java`

## Decisions and notes
- Policies in `orbit.escalation.json` (`GET/PUT/DELETE /api/escalation`) have steps `{afterMinutes, channelIds}` and `groupIds`; a monitor escalates by its group's policy.
- `EscalationRunner.tick()` runs every 15 s and sends each due step once ("Escalation: ... (not acknowledged)"); acknowledging or resolving stops it; silenced monitors are skipped.
- The wall incident carries `escalatesAt` (next step time) for the countdown.
- Steps now have an optional `name` (default "Step n") and `onCallScheduleId` (BE-33). `PUT /api/escalation/{id} {name, groupIds[], steps[{afterMinutes, channelIds[], name?, onCallScheduleId?}]}`; `GET /api/escalation` returns the stored policies (`steps[].after` is a duration in seconds).
- Countdown API for FE-40: `GET /api/escalation/upcoming` -> `[{incidentId, monitorId, policyId, policyName, stepIndex, stepName, dueAt, channelIds, onCall}]` soonest first (open, unacknowledged, not collapsed into an upstream incident); `GET /api/incidents/{id}/escalation` -> the same object, or 204 when nothing escalates. The wall snapshot still carries `escalatesAt`; the step name is not in the wall WebSocket contract (owned by the realtime protocol) - the wall can read it from the REST endpoint or the protocol owner can add `escalationStep` to `IncidentView` from `EscalationRunner.next`.
- Incidents collapsed into an upstream incident (BE-30) never escalate; steps are tracked by index so two identical steps both fire.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — escalation step timing implemented; scheduling and channel dispatch pending.
- 2026-10-18 — escalation runner, API and wall countdown (status: done).
- 2026-10-22 — step names, on-call person in the message and the upcoming-step API for the countdown.
