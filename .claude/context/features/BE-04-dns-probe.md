---
id: BE-04
title: "DNS probe"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-04 · DNS probe

## Summary
Record type, expected value, resolution time

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/dns/DnsProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/dns/DnsProbeTest.java`

## Decisions and notes
- Resolver port (JNDI DNS); expected value among answers; failures reported in the result.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
