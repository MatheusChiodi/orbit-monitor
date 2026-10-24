---
screen: status-page
title: "Status page builder"
route: "index.html#/status-pages"
status: done
spec: FE-44, BE-42
updated: 2026-10-24
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
- `frontend/src/domains/workspace/StatusPageBuilder/statusPage.ts`

## Tests
- `frontend/src/app/console/screens/StatusPagesScreen/statusPageRecords.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`
- `frontend/src/domains/workspace/StatusPageBuilder/StatusPageBuilder.test.tsx`

## Decisions and notes
- Redesign (FE-44): "Slug" became "Address" with the full URL as hint (`statusPageUrl`, served by `GET /api/status/{slug}`); Internal/Public is a segmented control with a sentence explaining who can open the page; "All groups" checkbox (indeterminate when partial); the preview always shows a title placeholder and an invitation when no group is chosen; saved pages list the address and an "Open page" link, also shown in the confirmation after saving.
- Open: there is no human-readable status page yet, the link opens the JSON view of BE-42; a rendered page is a backend/wall follow-up.

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — screen routed and wired to the assumed `/api/status-pages` contract (status: in-progress).
- 2026-10-24 — redesign: Address with full URL, Internal/Public explained, select all groups, non-empty preview, Open page after save.
- 2026-10-24 — saved pages: Open ↗ (`/status/{slug}`, the server-rendered HTML page), Copy URL, Edit (loads the page into the form, Save changes keeps its id, Cancel editing) and Delete (confirm Dialog, toast); toasts for save (with Open) and delete; palette action `new-status-page` focuses a fresh form; dev proxy for `/status`.
