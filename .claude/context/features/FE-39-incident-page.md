---
id: FE-39
title: "Incident page"
area: frontend
group: "Console productivity"
status: done
screens: [incident-detail]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-39 · Incident page

## Summary
Timeline, comments, acknowledge, ticket link, postmortem

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[incident-detail](../screens/incident-detail.md)

## Code
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.tsx`
- `frontend/src/app/console/screens/IncidentScreen/IncidentScreen.tsx`
- `frontend/src/app/console/screens/IncidentScreen/incidentDetail.ts`
- `frontend/src/app/console/screens/IncidentsScreen/IncidentsScreen.tsx`
- `frontend/src/app/console/routes/routes.ts`
- `frontend/src/shared/api/consoleEndpoints.ts`
- `frontend/src/shared/api/consoleTypes.ts`

## Tests
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.test.tsx`
- `frontend/src/app/console/screens/IncidentScreen/incidentDetail.test.ts`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`
- `frontend/src/app/console/routes/routes.test.ts`
- `frontend/src/shared/api/consoleEndpoints.test.ts`

## Decisions and notes
- Identification, elapsed time, impact chips, escalation countdown, Acknowledge, masked timeline, comments with "(self-declared)" operator names, ticket link (edit mode only) and a postmortem with time to acknowledge / resolve once resolved.
- Routes `#/incidents` (open first, then resolved) and `#/incidents/:id` read `GET /api/incidents[/{id}]` (io.orbit.alerting.Incident); acknowledge, comment and ticket post to `/api/incidents/{id}/ack|comments|ticket` with the self-declared operator; the response replaces the cached incident.
- `toIncidentDetail` resolves monitor/group names, keeps COMMENTED events as comments and maps the other events to timeline kinds (RESOLVED = OK, ACKNOWLEDGED = ACK, ticket/comment = INFO); UNKNOWN severity shows as WARN.
- Routing decision: a 60-line hash router (`useSyncExternalStore` on `hashchange`) instead of wouter (~2.2 KB, MIT) or TanStack Router (~15 KB, MIT): the console needs a dozen flat routes, one parameter, no loaders; zero new dependencies and back/forward work because the hash is the state. Sources: https://tanstack.com/router/latest/docs/comparison.md, https://www.pistack.xyz/posts/2026-08-13-react-router-vs-tanstack-router-vs-wouter-typescript-comparison/

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — incident page component (status: in-progress).
- 2026-10-22 — routes `#/incidents` and `#/incidents/:id` wired to the incident API with TanStack Query (status: done).
