---
id: BE-42
title: "Status page API"
area: backend
group: "Workspace and configuration"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-42 · Status page API

## Summary
Public/internal read-only, cached, no personal data

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/status/StatusPageBuilder.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/status/StatusPageBuilderTest.java`

## Decisions and notes
- Only group name, state and uptime; overall = worst state; no values, errors or names.
- `StatusPageBuilder.build`: groups in the page's order with name, state and uptime rounded to 2 decimals; groups without data are left out (their internal id is never shown); overall = worst listed state, UNKNOWN when nothing is known. The view has no values, errors or operator names.
- Still to do: `orbit.status-pages.json` store (schema in orbit-config) and the read-only `GET` endpoint with cache headers (public pages reachable from the LAN, internal ones from editors only).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — status page view builder implemented; StatusPageBuilderTest un-pended (store and endpoint pending).
