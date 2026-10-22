---
id: BE-04
title: "DNS probe"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-04 · DNS probe

## Summary
Record type, expected value, resolution time

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/dns/DnsProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/dns/DnsProbeTest.java`

## Decisions and notes
- Resolver port (JNDI DNS); expected value among answers; failures reported in the result.
- Resolver port keeps the probe free of a DNS library; production adapter is JNDI DNS (`com.sun.jndi.dns`, JDK built-in) rather than dnsjava (BSD, extra dependency) because only A/AAAA/CNAME/MX/TXT/NS lookups are needed.
- Answers are compared case-insensitively and without the trailing root dot; with no expected value any non-empty answer matches.
- Lookup errors (NXDOMAIN, timeout) come back in `error` with the exception type; nothing is thrown.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented DNS probe with expected-value match, timing and reported failures (status: done).
