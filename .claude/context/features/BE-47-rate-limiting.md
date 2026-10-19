---
id: BE-47
title: "Rate limiting"
area: backend
group: "Security and platform"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-47 · Rate limiting

## Summary
Per client IP on API and Push endpoints

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-security/src/main/java/io/orbit/security/access/RateLimiter.java`

## Tests
- `backend/orbit-security/src/test/java/io/orbit/security/access/RateLimiterTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/RateLimitApiTest.java`

## Decisions and notes
- Token bucket per client IP (`orbit.rate-limit.requests-per-minute`, `burst`); refused requests get 429 Problem Details `rate-limited` with Retry-After; no lockout.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
