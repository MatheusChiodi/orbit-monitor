---
id: BE-32
title: "Silence/snooze"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-32 · Silence/snooze

## Summary
With reason, actor and expiry

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/SilenceService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/SilenceController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/SilenceServiceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AlertingApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AlertingReloadTest.java`

## Decisions and notes
- `GET/POST/DELETE /api/silences` (`{target, reason, minutes}`, 1 min to 7 days); target is a monitor or group id; silenced incidents still open but notify nobody.
- `orbit.silences.json` is a `ConfigFile` bean like every alerting file (channels, escalation, maintenance, dependencies, oncall, notification-templates), so `ConfigReloader` picks up external edits every 5 s.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — silences in orbit.silences.json implemented; REST endpoints pending.
- 2026-10-18 — silence API and notification suppression (status: done).
- 2026-10-22 — silences file registered as a bean so external edits are reloaded.
