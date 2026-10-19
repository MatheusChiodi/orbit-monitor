---
id: BE-08
title: "OAuth2 client credentials"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-08 · OAuth2 client credentials

## Summary
Token cached and refreshed before expiry

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/oauth/OAuth2TokenProvider.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/oauth/OAuth2TokenProviderTest.java`

## Decisions and notes
- Token endpoint port; cached until `expiresIn - refreshMargin`; credentials never print the secret.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
