---
id: BE-44
title: "Network access policy"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-44 · Network access policy

## Summary
No login; mutations only from loopback by default, `lan` or CIDR allowlist configurable, view-only otherwise; `403` Problem Details

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/AccessFilter.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AccessController.java`
- `backend/orbit-security/src/main/java/io/orbit/security/access/AccessPolicy.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/AccessAndGroupsApiTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/access/AccessPolicyTest.java`

## Decisions and notes
- Servlet filter at highest precedence: GET/HEAD/OPTIONS are reads, `POST /api/incidents/**` is acknowledge, everything else is a mutation; the client address is the TCP peer (forwarding headers ignored).
- Denied requests get `403` Problem Details with `code: access-denied`.
- Mode comes from `orbit.access.*` properties for now; moving it to `orbit.settings.json` is pending.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — access filter implemented (status: done).
- 2026-10-18 — GET /api/access returns {mode: edit|view-only, client: loopback|lan|unknown}; 403 is translated.
