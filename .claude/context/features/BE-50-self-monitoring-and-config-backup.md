---
id: BE-50
title: "Self-monitoring and config backup"
area: backend
group: "Security and platform"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-50 · Self-monitoring and config backup

## Summary
Micrometer metrics, Orbit monitors itself; `.bak` rotation and encrypted backup of the config directory

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigBackup.java`

## Tests
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigBackupTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/SelfMonitoringTest.java`

## Decisions and notes
- Micrometer `orbit.checks` and `orbit.queue.size`; built-in `orbit_self` monitor on /actuator/health; encrypted rotating backups `orbit-backup-<ts>.zip.enc`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
