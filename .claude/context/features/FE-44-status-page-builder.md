---
id: FE-44
title: "Status page builder"
area: frontend
group: "Console productivity"
status: done
screens: [status-page]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-44 · Status page builder

## Summary
Pick groups, preview the public/internal page

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[status-page](../screens/status-page.md)

## Code
- `frontend/src/domains/workspace/StatusPageBuilder/StatusPageBuilder.tsx`
- `frontend/src/domains/workspace/StatusPageBuilder/statusPage.ts`
- `frontend/src/app/console/screens/StatusPagesScreen/StatusPagesScreen.tsx`
- `frontend/src/app/console/screens/StatusPagesScreen/statusPageRecords.ts`

## Tests
- `frontend/src/domains/workspace/StatusPageBuilder/StatusPageBuilder.test.tsx`
- `frontend/src/app/console/screens/StatusPagesScreen/statusPageRecords.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Decisions and notes
- A page stores title, slug, visibility and group ids only; the preview shows group states (no values or rules) with the wall surface (no personal data); public pages show a warning.
- Route `#/status-pages`: drafts map to `orbit.status-pages.json` items `{id, slug, title, pub, groupIds}` (schema in orbit-config); saving an existing slug keeps its id.
- Verified against the BE-42 controller (developer ff09126): `GET /api/status-pages` answers `{version, items}`, `PUT /api/status-pages/{id}` takes `{id, slug, title, groupIds, pub}`; the read-only page is `GET /api/status/{slug}`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — status page builder component (status: in-progress).
- 2026-10-22 — `#/status-pages` screen wired to the assumed `/api/status-pages` contract (status: in-progress until BE-42 exposes it).
- 2026-10-22 — contract verified against the BE-42 status page API (status: done).
