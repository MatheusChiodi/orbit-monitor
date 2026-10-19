---
id: BE-32
title: "Silence/snooze"
area: backend
group: "Alerting"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-32 · Silence/snooze

## Summary
With reason, actor and expiry

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/SilenceService.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/SilenceServiceTest.java`

## Decisions and notes
- Reason, operator and future expiry required; expired silences are pruned; stored in orbit.silences.json.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — silences in orbit.silences.json implemented; REST endpoints pending.
