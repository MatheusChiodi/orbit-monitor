---
id: BE-03
title: "Push monitor"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-03 · Push monitor

## Summary
Generated URL with secret token; "no signal for X min" = down

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/push/PushRegistry.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/PushController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorRequestMapper.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AccessFilter.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/CheckMonitorDef.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/push/PushRegistryTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ChecksApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`

## Decisions and notes
- Secret URL-safe token per push monitor (rotating invalidates the old one); silence beyond maxSilence is DOWN.
- API: `POST /api/monitors` with `type: PUSH` generates the token in `PushRegistry`, seals it in the vault (`pushToken: {"enc": ...}` in `orbit.checks.json`) and returns `pushUrl` only in that creation response; reads show `•••• (vault)`. Updates keep the sealed token.
- `POST|GET /api/push/{token}` records the signal and returns the monitor id; an unknown token is a 404 that never echoes it. The token is the credential, so the access filter treats the path as READ (jobs on the LAN may call it). Per-IP limits: BE-47.
- `MonitorRuntime.syncSchedule` restores decrypted tokens into the registry (startup and every edit); deleting the monitor forgets it.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — push registry with constant-time token check implemented; push endpoint pending.
- 2026-10-22 — push endpoint and push monitor API wired; token sealed in the vault, never written in plain text (status: done).
- 2026-10-24 — push URL can be regenerated (POST /api/monitors/{id}/push-token) and duplicated push monitors get their own token; see BE-54.
