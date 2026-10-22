---
screen: incident-detail
title: "Incident detail"
route: "index.html#/incidents/:id"
status: done
spec: docs/02-features.md §4
updated: 2026-10-22
---

# Incident detail

## Purpose
Timeline, comments, acknowledge, ticket link, escalation countdown, postmortem.

## Layout and components
`IncidentScreen` (query `['incident', demo, id]`, ack/comment/ticket mutations) → `toIncidentDetail` → `IncidentPage` (header with severity, impact, `EscalationCountdown`, `AcknowledgeButton`; postmortem when resolved; timeline; comments; ticket link in edit mode).

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-06 · Incidents and acknowledgement](../features/CORE-06-incidents-and-acknowledgement.md) — in-progress
- [FE-39 · Incident page](../features/FE-39-incident-page.md) — done
- [FE-40 · Escalation countdown](../features/FE-40-escalation-countdown.md) — in-progress

## Code
- `frontend/src/app/console/screens/IncidentScreen/IncidentScreen.tsx`
- `frontend/src/app/console/screens/IncidentScreen/incidentDetail.ts`
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.tsx`

## Tests
- `frontend/src/app/console/screens/IncidentScreen/incidentDetail.test.ts`
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.test.tsx`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — route `#/incidents/:id` wired to the incident API (status: done).
- 2026-10-22 — resolve/reopen for editors, comments editor-only (BE-26), next escalation step (FE-40).
