---
screen: status-page
title: "Status page builder"
route: "index.html#/status-pages"
status: done
spec: FE-44, BE-42
updated: 2026-10-22
---

# Status page builder

## Purpose
Pick groups and preview the public/internal status page.

## Layout and components
`StatusPagesScreen` (`/api/status-pages` query and save) → `StatusPageBuilder`.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [FE-44 · Status page builder](../features/FE-44-status-page-builder.md) — done

## Code
- `frontend/src/app/console/screens/StatusPagesScreen/StatusPagesScreen.tsx`
- `frontend/src/domains/workspace/StatusPageBuilder/StatusPageBuilder.tsx`

## Tests
- `frontend/src/app/console/screens/StatusPagesScreen/statusPageRecords.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — screen routed and wired to the assumed `/api/status-pages` contract (status: in-progress).
