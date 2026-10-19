---
id: BE-48
title: "Secret rotation"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-48 · Secret rotation

## Summary
Rotate connection credentials without recreating monitors

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/ConnectionController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/ConnectionPools.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/SecretRotationApiTest.java`

## Decisions and notes
- PUT /api/connections/{id} with a new password re-seals the secret and evicts the pool; monitors keep `connectionId`; omitting the password keeps the current one.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — secret rotation covered by an API test (status: done).
