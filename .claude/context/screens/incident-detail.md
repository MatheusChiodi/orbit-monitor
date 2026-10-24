---
screen: incident-detail
title: "Incident detail"
route: "index.html#/incidents/:id"
status: done
spec: docs/02-features.md §4
updated: 2026-10-24
---

# Incident detail

## Purpose
Timeline, comments, acknowledge, ticket link, escalation countdown, postmortem.

## Layout and components
`IncidentScreen` (query `['incident', demo, id]`, ack/resolve/reopen/comment/ticket mutations) → `toIncidentDetail` → `IncidentPage`: PageHeader (back link, StatusBadge · group · elapsed, monitor name as h1; actions: escalation countdown, Acknowledge primary, Resolve / Reopen for editors); "Probable impact" chips; postmortem when resolved; timeline panel; Comments and Ticket as separate titled panels. `MonitorHistoryPanel` below.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-06 · Incidents and acknowledgement](../features/CORE-06-incidents-and-acknowledgement.md) — done
- [FE-39 · Incident page](../features/FE-39-incident-page.md) — done
- [FE-40 · Escalation countdown](../features/FE-40-escalation-countdown.md) — in-progress

## Code
- `frontend/src/app/console/screens/IncidentScreen/IncidentScreen.tsx`
- `frontend/src/app/console/screens/IncidentScreen/incidentDetail.ts`
- `frontend/src/app/console/screens/IncidentScreen/incidentWindow.ts`
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.tsx`

## Tests
- `frontend/src/app/console/screens/IncidentScreen/incidentDetail.test.ts`
- `frontend/src/app/console/screens/IncidentScreen/incidentWindow.test.ts`
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.test.tsx`
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.actions.test.tsx`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`

## Decisions and notes
- Acknowledge is the primary button (accent), never red; the wall AcknowledgeButton is no longer used here.
- History opens on the same 24 h preset as the monitor detail when the incident fits in it; older incidents keep the window around the incident (1 h before opening to 1 h after resolution, max 31 days).

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — route `#/incidents/:id` wired to the incident API (status: done).
- 2026-10-22 — resolve/reopen for editors, comments editor-only (BE-26), next escalation step (FE-40).
- 2026-10-22 — FE-58 history window around the incident.
- 2026-10-24 — redesign: Acknowledge primary, "Probable impact" label, separate Comments and Ticket sections, 24 h history default.
