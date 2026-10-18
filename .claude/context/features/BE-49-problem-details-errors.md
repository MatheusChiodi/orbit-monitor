---
id: BE-49
title: "Problem Details errors"
area: backend
group: "Security and platform"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-49 · Problem Details errors

## Summary
RFC 9457 responses with stable codes and i18n messages; OpenAPI

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/ProblemHandler.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/MonitorsApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AccessAndGroupsApiTest.java`

## Decisions and notes
- RFC 9457 bodies with stable `code`: invalid-config (422, with `errors`), unsafe-sql, invalid-condition, ssrf-blocked, secret-error (422), target-error (502), not-found (404), conflict (409), operator-required and bad-request (400), access-denied (403). Details are masked.
- Pending: i18n message keys.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — Problem Details handler with stable codes.
