---
id: BE-02
title: "Ping probe"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-02 · Ping probe

## Summary
ICMP with TCP fallback when ICMP is not permitted

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/ping/PingProbe.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorRequestMapper.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/CheckMonitorDef.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/ping/PingProbeTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ChecksApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`

## Decisions and notes
- ICMP port `IcmpPinger` (InetAddress.isReachable) with TCP fallback on a configured port.
- API: `POST /api/monitors` with `type: PING` (`host`) saves into `orbit.checks.json`; the SSRF guard runs before probing.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — ICMP ping with TCP fallback implemented; runtime integration pending.
- 2026-10-22 — ping monitors created and deleted through the monitor API (status: done).
