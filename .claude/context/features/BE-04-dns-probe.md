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
- `backend/orbit-probe/src/main/java/io/orbit/probe/dns/JndiDnsResolver.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/CheckMonitorDef.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/CheckProbeValidator.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/ExtendedChecks.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/ExtendedProbeBeans.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/dns/DnsProbeTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/dns/JndiDnsResolverTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/ExtendedDefinitionsTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`

## Decisions and notes
- Resolver port (JNDI DNS); expected value among answers; failures reported in the result.
- Resolver port keeps the probe free of a DNS library; production adapter is JNDI DNS (`com.sun.jndi.dns`, JDK built-in) rather than dnsjava (BSD, extra dependency) because only A/AAAA/CNAME/MX/TXT/NS lookups are needed.
- Answers are compared case-insensitively and without the trailing root dot; with no expected value any non-empty answer matches.
- Lookup errors (NXDOMAIN, timeout) come back in `error` with the exception type; nothing is thrown.
- Wired 2026-10-22: `orbit.checks.json` type `DNS` with `host` and `probe: {recordType, expected}`; created with `POST /api/monitors` `{"type":"DNS","name":...,"host":"api.example.com","probe":{"recordType":"A","expected":"93.184.216.34"}}`. The runtime runs it through `CheckRunner.runMeasured`: a missing expected answer is DOWN with the reason; conditions see `[RESPONSE_TIME]`, `[COL].ANSWERS`, `[COL].COUNT` and `[BODY]` (answers, one per line).
- Production resolver `JndiDnsResolver` (JDK `com.sun.jndi.dns`): system resolvers or `orbit.dns.server`; JNDI timeout = half the check timeout with 2 retries; TXT quotes removed, MX keeps its preference. A real lookup is not exercised in tests (no network in CI); the attribute parsing and the JNDI environment are.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented DNS probe with expected-value match, timing and reported failures (status: done).
- 2026-10-22 — wired into the runtime and the monitor API (DNS check type, JNDI resolver, validation, schema).
