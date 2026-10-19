---
id: BE-01
title: "TCP probe"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-01 · TCP probe

## Summary
Connect time, timeout, refused vs timeout distinction

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/tcp/TcpProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/tcp/TcpProbeTest.java`

## Decisions and notes
- Connect with a timeout; REFUSED vs TIMEOUT vs UNRESOLVED.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
