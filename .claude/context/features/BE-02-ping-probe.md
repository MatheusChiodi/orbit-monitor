---
id: BE-02
title: "Ping probe"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-02 · Ping probe

## Summary
ICMP with TCP fallback when ICMP is not permitted

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/ping/PingProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/ping/PingProbeTest.java`

## Decisions and notes
- ICMP port `IcmpPinger` (InetAddress.isReachable) with TCP fallback on a configured port.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
