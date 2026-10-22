---
id: BE-08
title: "OAuth2 client credentials"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-08 · OAuth2 client credentials

## Summary
Token cached and refreshed before expiry

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/oauth/OAuth2TokenProvider.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/oauth/OAuth2TokenProviderTest.java`

## Decisions and notes
- Token endpoint port; cached until `expiresIn - refreshMargin`; credentials never print the secret.
- Own small cache instead of Spring Security OAuth2 client / Nimbus: one grant type, no new dependency, and the clock is injectable for tests.
- Cache key is token URL + client id + scope (never the secret); refresh at `expiresIn - refreshMargin`, a lifetime shorter than the margin is used once. `invalidate` drops a token after a 401.
- `Credentials` and `Token` `toString` mask the secret and the access token.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented cached client-credentials tokens with early refresh and masked toString (status: done).
