---
id: CORE-06
title: "Incidents and acknowledgement"
area: full-stack
group: "Alerting"
status: in-progress
screens: [wall, incidents, incident-detail]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-06 · Incidents and acknowledgement

## Summary
Open on DOWN (or WARN if configured), auto-close on recovery, acknowledge with name and time.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [incidents](../screens/incidents.md), [incident-detail](../screens/incident-detail.md)

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/Incident.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/InMemoryIncidentRepository.java`
- `backend/orbit-common/src/main/java/io/orbit/common/OperatorName.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentServiceTest.java`
- `backend/orbit-common/src/test/java/io/orbit/common/OperatorNameTest.java`

## Decisions and notes
- Backend: `IncidentService` listens to confirmed `MonitorStateChanged` events: opens on DOWN (WARN only for monitors configured to open on WARN), records severity changes, resolves on OK with duration, and reopens a relapse within 5 min instead of opening a new incident.
- Backend: Acknowledge is idempotent (first acknowledgement wins) and rejected on resolved incidents; comments and ticket links go to the timeline with the self-declared operator name (`OperatorName`: trimmed, control chars removed, max 60).
- Backend: Incidents live in memory; resolved ones are dropped 24 h after resolution.
- Backend: Pending: REST endpoints and wall push.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: incident lifecycle domain (open, severity, resolve, reopen, acknowledge, comment, ticket).
