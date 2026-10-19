---
id: BE-26
title: "Incident lifecycle"
area: backend
group: "Alerting"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-26 · Incident lifecycle

## Summary
Open, acknowledge, resolve, reopen; event log with actor and time

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/Incident.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/IncidentController.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentServiceTest.java`

## Decisions and notes
- Timeline events OPENED, SEVERITY_CHANGED, ACKNOWLEDGED, COMMENTED, TICKET_LINKED, RESOLVED, REOPENED with actor (`orbit` for automatic ones) and time.
- Relapse within 5 min reopens the same incident.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — lifecycle with event log and reopen.
