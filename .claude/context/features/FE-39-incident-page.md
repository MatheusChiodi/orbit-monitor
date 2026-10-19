---
id: FE-39
title: "Incident page"
area: frontend
group: "Console productivity"
status: in-progress
screens: [incident-detail]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-39 · Incident page

## Summary
Timeline, comments, acknowledge, ticket link, postmortem

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[incident-detail](../screens/incident-detail.md)

## Code
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.tsx`

## Tests
- `frontend/src/domains/alerting/IncidentPage/IncidentPage.test.tsx`

## Decisions and notes
- Identification, elapsed time, impact chips, escalation countdown, Acknowledge, masked timeline, comments with "(self-declared)" operator names, ticket link (edit mode only) and a postmortem with time to acknowledge / resolve once resolved.
- Pending: route `#/incidents/:id` and the incident API.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — incident page component (status: in-progress).
