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
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.actions.test.tsx`

## Decisions and notes
- Identification, elapsed time, impact chips, escalation countdown, Acknowledge, masked timeline, comments labelled by client kind (`ActorLabel`; legacy names through `SafeValue`), "Acknowledged at HH:MM" without a name, ticket link (edit mode only) and a postmortem with time to acknowledge / resolve once resolved.
- Routes `#/incidents` (open first, then resolved) and `#/incidents/:id` read `GET /api/incidents[/{id}]` (io.orbit.alerting.Incident); acknowledge, comment and ticket post to `/api/incidents/{id}/ack|comments|ticket` with the self-declared operator; the response replaces the cached incident.
- `toIncidentDetail` resolves monitor/group names, keeps COMMENTED events as comments and maps the other events to timeline kinds (RESOLVED = OK, ACKNOWLEDGED = ACK, ticket/comment = INFO); UNKNOWN severity shows as WARN.
- Routing decision: a 60-line hash router (`useSyncExternalStore` on `hashchange`) instead of wouter (~2.2 KB, MIT) or TanStack Router (~15 KB, MIT): the console needs a dozen flat routes, one parameter, no loaders; zero new dependencies and back/forward work because the hash is the state. Sources: https://tanstack.com/router/latest/docs/comparison.md, https://www.pistack.xyz/posts/2026-08-13-react-router-vs-tanstack-router-vs-wouter-typescript-comparison/
- BE-26 access rule: view-only clients may only acknowledge; resolve/reopen, comments and the ticket link are editor-only (the earlier test that let view-only clients comment was updated to the backend rule). Resolve/reopen errors (409) are shown on the page.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — incident page component (status: in-progress).
- 2026-10-22 — routes `#/incidents` and `#/incidents/:id` wired to the incident API with TanStack Query (status: done).
- 2026-10-22 — resolve/reopen for editors, comments editor-only, next escalation step.
- 2026-10-22 — operator name retired: incident actions send no name; timeline events read "Acknowledged · This machine"; the list shows "Acknowledged at HH:MM".
