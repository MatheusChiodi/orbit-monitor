---
id: CORE-06
title: "Incidents and acknowledgement"
area: full-stack
group: "Alerting"
status: done
screens: [wall, incidents, incident-detail]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-06 · Incidents and acknowledgement

## Summary
Open on DOWN (or WARN if configured), auto-close on recovery, acknowledge with name and time.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

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
- `frontend/src/app/console/screens/IncidentScreen/IncidentScreen.tsx`
- `frontend/src/shared/api/consoleEndpoints.ts`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentServiceTest.java`
- `backend/orbit-common/src/test/java/io/orbit/common/OperatorNameTest.java`
- `frontend/src/domains/wall/components/AcknowledgeButton/AcknowledgeButton.test.tsx`
- `frontend/src/domains/wall/feed/wallFeed.test.ts`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentLifecycleTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/IncidentApiTest.java`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`
- `frontend/src/domains/wall/feed/wallFeed.ack.test.ts`

## Decisions and notes
- Frontend: Acknowledge is the only wall action: solid red for DOWN, neutral for WARN; it becomes "Acknowledged at 17:04" / "Reconhecido às 17:04" (no name since 2026-10-22: `acknowledgedBy` holds the client kind and is never shown as a person).
- Backend: `IncidentService` listens to confirmed `MonitorStateChanged` events: opens on DOWN (WARN only for monitors with `openOnWarn`), records severity changes, resolves on OK with duration, and reopens a relapse within 5 min.
- Backend: Acknowledge is idempotent (first acknowledgement wins) and rejected on resolved incidents (409); comments and ticket links go to the timeline with the client kind as actor (`loopback`, `lan`; no operator name since 2026-10-22).
- Backend: REST: `GET /api/incidents`, `GET /api/incidents/{id}`, `POST /api/incidents/{id}/ack` (no body), `/comments {text}`, `/ticket {ticket}`; changes are pushed on `/ws/wall` as `incident` messages.
- Backend: Incidents live in memory; resolved ones are dropped 24 h after resolution.
- Backend: complete. REST adds `POST /api/incidents/{id}/resolve|reopen`, `GET /api/incidents?status=&monitorId=`, `GET /api/incidents/{id}/postmortem` and `GET /api/incidents/summary` (BE-34); shapes in BE-26 / BE-34. LAN clients may only acknowledge.
- Frontend: the console lists, opens, acknowledges, resolves/reopens (editors), comments and links tickets through the incident API; the header bell is the incident feed (FE-38).
- Frontend (verified end to end against the controller): the wall posts `/api/incidents/{id}/ack` with no body and no `X-Orbit-Operator` (operator name retired 2026-10-22, BE-45); a local acknowledgement (demo, network failure) marks `acknowledgedBy: 'unknown'`; the REST answer is the alerting record, so only `acknowledgedBy/At` are merged into the wall view (impact and escalation stay; the `/ws/wall` `incident` view follows). A refused acknowledgement (4xx: 403 when LAN acknowledgement is disabled, 409 when already resolved) is never faked locally; demo mode and network failures still mark it locally so the wall never gets stuck. Console: incident list/page with ack for everyone and resolve/reopen, comments and tickets for editors.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: incident lifecycle domain (open, severity, resolve, reopen, acknowledge, comment, ticket).
- 2026-10-18 — frontend: acknowledge button and optimistic acknowledgement.
- 2026-10-18 — backend: REST endpoints and wall push for incidents.
- 2026-10-22 — backend: resolve/reopen, filters, postmortem and summary endpoints; acknowledgement is the only LAN action.
- 2026-10-22 — frontend: console incident list, page and actions wired to the API.
- 2026-10-22 — frontend: wall ack merges the REST answer into the wall view and never fakes a refused ack; flow verified end to end (status: done).
- 2026-10-22 — frontend: operator name retired; ack/resolve/reopen send no body, comments `{text}`, tickets `{ticket}`; "Acknowledged at HH:MM" without a name.
- 2026-10-22 — backend: actor is the client kind; `by` is no longer read.
