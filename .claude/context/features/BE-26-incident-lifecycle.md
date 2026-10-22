---
id: BE-26
title: "Incident lifecycle"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-26 · Incident lifecycle

## Summary
Open, acknowledge, resolve, reopen; event log with actor and time

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/Incident.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/IncidentController.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentEventType.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AccessFilter.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentServiceTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentLifecycleTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/IncidentApiTest.java`

## Decisions and notes
- Timeline events OPENED, SEVERITY_CHANGED, ACKNOWLEDGED, COMMENTED, TICKET_LINKED, RESOLVED, REOPENED with actor (`orbit` for automatic ones) and time.
- Relapse within 5 min reopens the same incident.
- Operators resolve (`RESOLVED` with their name) and reopen (`REOPENED` with their name); reopen clears the acknowledgement so escalation and acknowledgement start again, and is refused (409) while the monitor already has another open incident. Resolving a resolved incident or reopening an open one is 409 `conflict`.
- Only `POST /api/incidents/{id}/ack` is open to view-only (LAN) clients; resolve, reopen, comments and tickets follow the mutation policy (loopback by default).
- REST (JSON = the `Incident` record: `id, monitorId, status OPEN|RESOLVED, severity WARN|DOWN, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt, ticket, flapping, parentId, events[{type, actor, at, detail}]`): `GET /api/incidents?status=OPEN|RESOLVED&monitorId=` (newest first, 400 on an unknown status), `GET /api/incidents/{id}`, `POST /api/incidents/{id}/ack|resolve|reopen {by?}`, `POST /{id}/comments {by?, text}`, `POST /{id}/ticket {by?, ticket}`; the operator comes from `X-Orbit-Operator` (or `by`). Every change is audited (`incident.ack|resolve|reopen|comment|ticket`) and pushed on `/ws/wall`.
- Event types: OPENED, SEVERITY_CHANGED, ACKNOWLEDGED, COMMENTED, TICKET_LINKED, RESOLVED, REOPENED, FLAPPING_STARTED, FLAPPING_STOPPED (BE-25), CORRELATED (BE-30).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — lifecycle with event log and reopen.
- 2026-10-22 — manual resolve/reopen with actor, list filters, LAN only acknowledges; API documented (status: done).
