---
id: BE-01
title: "TCP probe"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-01 · TCP probe

## Summary
Connect time, timeout, refused vs timeout distinction

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/tcp/TcpProbe.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorRequest.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorRequestMapper.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/CheckMonitorDef.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/tcp/TcpProbeTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ChecksApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/MonitorRequestMapperTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`

## Decisions and notes
- Connect with a timeout; REFUSED vs TIMEOUT vs UNRESOLVED.
- API: `POST /api/monitors` with `type: TCP` (`host`, `port`) saves into `orbit.checks.json`; form conditions without a placeholder map to `[RESPONSE_TIME]`; delete covers checks.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — TCP probe implemented; runtime integration via orbit.checks.json pending.
- 2026-10-22 — TCP monitors created and deleted through the monitor API (status: done).
