---
id: FE-44
title: "Status page builder"
area: frontend
group: "Console productivity"
status: in-progress
screens: [status-page]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-44 · Status page builder

## Summary
Pick groups, preview the public/internal page

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[status-page](../screens/status-page.md)

## Code
- `frontend/src/domains/workspace/StatusPageBuilder/StatusPageBuilder.tsx`
- `frontend/src/domains/workspace/StatusPageBuilder/statusPage.ts`

## Tests
- `frontend/src/domains/workspace/StatusPageBuilder/StatusPageBuilder.test.tsx`

## Decisions and notes
- A page stores title, slug, visibility and group ids only; the preview shows group states (no values or rules) with the wall surface (no personal data); public pages show a warning.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — status page builder component (status: in-progress).
