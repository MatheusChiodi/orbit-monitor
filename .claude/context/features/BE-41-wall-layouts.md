---
id: BE-41
title: "Wall layouts"
area: backend
group: "Workspace and configuration"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-41 · Wall layouts

## Summary
Versioned layouts addressed by slug (`/wall/noc`), read-only for view clients

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/layout/WallLayoutService.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/layout/WallLayoutServiceTest.java`

## Decisions and notes
- Layouts by unique URL-safe slug, version incremented on save, blocks on a 12-column grid; built-in `noc` layout; no wall token.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
