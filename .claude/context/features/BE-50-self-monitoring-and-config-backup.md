---
id: BE-50
title: "Self-monitoring and config backup"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-50 · Self-monitoring and config backup

## Summary
Micrometer metrics, Orbit monitors itself; `.bak` rotation and encrypted backup of the config directory

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigBackup.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/SelfMonitor.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/SelfMonitoringBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorController.java`
- `backend/orbit-api/src/main/resources/application.yml`

## Tests
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigBackupTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/SelfMonitoringTest.java`

## Decisions and notes
- Micrometer `orbit.checks` and `orbit.queue.size`; built-in `orbit_self` monitor on /actuator/health; encrypted rotating backups `orbit-backup-<ts>.zip.enc`.
- Metrics: `orbit.checks` counter tagged only by resulting `state` (registered at zero for every state, incremented from `EventBus.onCheck`) and `orbit.queue.size` gauge over the probe queue; `/actuator/metrics` exposed (loopback bind by default, no personal data in tags). Micrometer comes with Spring Boot Actuator; no extra dependency.
- `orbit_self` reads the in-process `HealthEndpoint` every 30 s (no HTTP round trip) and records heartbeats in telemetry; `GET /api/monitors` always lists it first with type `SELF`. The id is reserved on save.
- Backups: `ConfigBackup` zips the config files (sealed secrets stay sealed) and encrypts the whole zip with the vault (`SecretResolver.seal` over Base64, AES-256-GCM with `master.key`) into `~/.orbit/backups/orbit-backup-<UTC ms>-<seq>.zip.enc`, newest first, keeping `orbit.backup.keep` (7); daily job, first run an hour after start. Each config write still keeps one `.bak` (`ConfigFile`).
- 2026-10-22: `SelfMonitoringTest` stays green with the new probes and history wiring; the self monitor is unaffected by execution windows and retries.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — Micrometer metrics, orbit_self monitor and encrypted rotating config backups implemented (status: done).
- 2026-10-22 — re-verified with the runtime changes.
