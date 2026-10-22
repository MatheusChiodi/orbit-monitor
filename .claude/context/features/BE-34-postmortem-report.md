---
id: BE-34
title: "Postmortem report"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-34 · Postmortem report

## Summary
Timeline, MTTA, MTTR, who acknowledged

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/report/PostmortemReport.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/IncidentController.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/report/PostmortemReportTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/IncidentApiTest.java`

## Decisions and notes
- MTTA/MTTR from the incident timeline; summary averages per team.
- Report built from the immutable `Incident`: MTTA = opened -> acknowledged, MTTR = opened -> resolved (null while missing); timeline is the incident's event list. `Summary` means skip incidents without the measure and are null without data.
- API: `GET /api/incidents/{id}/postmortem` -> `{incidentId, monitorId, monitorName, groupId, status, severity, openedAt, acknowledgedAt, acknowledgedBy, resolvedAt, timeToAcknowledgeSeconds, timeToResolveSeconds, ticket, timeline[{type, actor, at, detail}]}` (seconds null while missing; 404 unknown). `GET /api/incidents/summary` -> `{incidents, meanTimeToAcknowledgeSeconds, meanTimeToResolveSeconds, groups[{groupId, incidents, meanTimeToAcknowledgeSeconds, meanTimeToResolveSeconds}]}` over the incidents in memory (24 h after resolution). Labels are translated by the console (en/pt-BR); the API carries no prose.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — postmortem report and summary implemented; pending tag removed (status: done).
- 2026-10-22 — postmortem and per-group MTTA/MTTR summary exposed over the API.
