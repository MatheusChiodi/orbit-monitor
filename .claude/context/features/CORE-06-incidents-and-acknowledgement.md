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
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [incidents](../screens/incidents.md), [incident-detail](../screens/incident-detail.md)

## Code
- `frontend/src/domains/wall/components/AcknowledgeButton/AcknowledgeButton.tsx`
- `frontend/src/domains/wall/feed/wallFeed.ts`
- `frontend/src/shared/api/client.ts`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/Incident.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/InMemoryIncidentRepository.java`
- `backend/orbit-common/src/main/java/io/orbit/common/OperatorName.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/IncidentController.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentServiceTest.java`
- `backend/orbit-common/src/test/java/io/orbit/common/OperatorNameTest.java`
- `frontend/src/domains/wall/components/AcknowledgeButton/AcknowledgeButton.test.tsx`
- `frontend/src/domains/wall/feed/wallFeed.test.ts`

## Decisions and notes
- Frontend: Acknowledge is the only wall action: solid red for DOWN, neutral for WARN; it becomes "M. Chiodi acknowledged at 17:04" / "M. Chiodi reconheceu às 17:04".
- Frontend: `POST /api/incidents/{id}/ack` with the operator in `X-Orbit-Operator`; in demo mode or on API failure the wall marks it locally (optimistic).
- Backend: `IncidentService` listens to confirmed `MonitorStateChanged` events: opens on DOWN (WARN only for monitors with `openOnWarn`), records severity changes, resolves on OK with duration, and reopens a relapse within 5 min.
- Backend: Acknowledge is idempotent (first acknowledgement wins) and rejected on resolved incidents (409); comments and ticket links go to the timeline with the self-declared operator name.
- Backend: REST: `GET /api/incidents`, `GET /api/incidents/{id}`, `POST /api/incidents/{id}/ack {by}`, `/comments {by,text}`, `/ticket {by,ticket}`; changes are pushed on `/ws/wall` as `incident` messages.
- Backend: Incidents live in memory; resolved ones are dropped 24 h after resolution.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: incident lifecycle domain (open, severity, resolve, reopen, acknowledge, comment, ticket).
- 2026-10-18 — frontend: acknowledge button and optimistic acknowledgement.
- 2026-10-18 — backend: REST endpoints and wall push for incidents.
