---
id: BE-05
title: "Certificate and domain expiry"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-05 · Certificate and domain expiry

## Summary
Days left, chain and issuer; domain expiry via RDAP; 30/14/7-day warnings

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/cert/ExpiryPolicy.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/cert/ExpiryPolicyTest.java`

## Decisions and notes
- OK > 30 days, WARN 30..8, DOWN <= 7; warning steps 30/14/7; domain expiry from RDAP `expiration` event.
- RDAP JSON is read with the Jackson tree model already on the classpath (no RDAP client library); invalid JSON or a missing `expiration` event yields empty.
- `warningStep` returns the smallest step already crossed (30, 14 or 7) so callers notify once per step.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented expiry states, 30/14/7 warning steps and RDAP expiration parsing (status: done).
