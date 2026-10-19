---
id: BE-27
title: "Escalation policies"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
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

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/escalation/EscalationPolicyTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/escalation/EscalationRunnerTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/NotificationDispatcherTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AlertingApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallViewFactoryTest.java`

## Decisions and notes
- Policies in `orbit.escalation.json` (`GET/PUT/DELETE /api/escalation`) have steps `{afterMinutes, channelIds}` and `groupIds`; a monitor escalates by its group's policy.
- `EscalationRunner.tick()` runs every 15 s and sends each due step once ("Escalation: ... (not acknowledged)"); acknowledging or resolving stops it; silenced monitors are skipped.
- The wall incident carries `escalatesAt` (next step time) for the countdown.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — escalation step timing implemented; scheduling and channel dispatch pending.
- 2026-10-18 — escalation runner, API and wall countdown (status: done).
