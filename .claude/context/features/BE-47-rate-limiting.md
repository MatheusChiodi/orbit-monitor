---
id: BE-47
title: "Rate limiting"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-47 · Rate limiting

## Summary
Per client IP on API and Push endpoints

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-security/src/main/java/io/orbit/security/access/RateLimiter.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/RateLimitFilter.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/WebBeans.java`

## Tests
- `backend/orbit-security/src/test/java/io/orbit/security/access/RateLimiterTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/RateLimitApiTest.java`

## Decisions and notes
- Token bucket per client IP (`orbit.rate-limit.requests-per-minute`, `burst`); refused requests get 429 Problem Details `rate-limited` with Retry-After; no lockout.
- Hand-rolled token bucket (refill = requestsPerMinute/60 per second, capacity = burst) with `Clock` injection; Retry-After = time to the next whole token. Alternative considered: Bucket4j (Apache-2.0, well maintained) — not needed for one in-process limiter. Client buckets live in an access-ordered map capped at 10,000 IPs (least recently seen evicted), so memory stays bounded.
- API: `RateLimitFilter` runs right after the access filter on `/api/*` (push endpoint included), keyed by the TCP peer address (forwarding headers never trusted); 429 body is localized (en, pt-BR) and `Retry-After` is whole seconds. Defaults 300 req/min, burst 60; loopback is exempt (`orbit.rate-limit.exempt-loopback`, default true) because the local console polls constantly and the limit targets floods from the network.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented the per-IP token bucket in orbit-security; API wiring still pending.
- 2026-10-22 — 429 wiring in orbit-api (RateLimitFilter); RateLimitApiTest un-pended (status: done).
