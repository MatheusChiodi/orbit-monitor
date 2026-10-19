---
id: BE-42
title: "Status page API"
area: backend
group: "Workspace and configuration"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-42 · Status page API

## Summary
Public/internal read-only, cached, no personal data

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/status/StatusPageBuilder.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/status/StatusPageBuilderTest.java`

## Decisions and notes
- Only group name, state and uptime; overall = worst state; no values, errors or names.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
