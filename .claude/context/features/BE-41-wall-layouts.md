---
id: BE-41
title: "Wall layouts"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-41 · Wall layouts

## Summary
Versioned layouts addressed by slug (`/wall/noc`), read-only for view clients

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/layout/WallLayoutService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/LayoutController.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/layout/WallLayoutServiceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/LayoutApiTest.java`

## Decisions and notes
- `GET /api/layouts`, `GET /api/layouts/{slug}` (any client), `PUT/DELETE /api/layouts/{id}` (editors); stored in `orbit.layouts.json`; version increments on every save.
- Without configuration `noc` resolves to the built-in prototype layout (hero, also active, near limit, matrix, timeline); unknown slugs are 404.
- `/ws/wall?layout=<slug>` is accepted; the wall loads the layout by slug and the snapshot stays the same for every layout.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — layouts by slug with versions and API (status: done).
