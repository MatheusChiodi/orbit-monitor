---
screen: monitor-list
title: "Monitor list"
route: "index.html#/monitors"
status: in-progress
spec: docs/02-features.md §1–2
updated: 2026-10-18
---

# Monitor list

## Purpose
Groups and monitors with state, filters, saved views, bulk actions.

## Layout and components
- `ConsoleApp` → operator prompt (first visit) → header (language, open wall, operator name, change name) → `ViewOnlyBanner` → `GroupList`
- `GroupList`: text filter, "New monitor" (edit mode only), one section per group with summary and a row per monitor (state text, name, type, rule, value)

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-07 · Workspaces and groups](../features/CORE-07-workspaces-and-groups.md) — in-progress
- [FE-13 · Reorder monitors and groups](../features/FE-13-reorder-monitors-and-groups.md) — tests-pending
- [FE-28 · Command palette](../features/FE-28-command-palette.md) — done
- [FE-29 · Keyboard shortcuts](../features/FE-29-keyboard-shortcuts.md) — done
- [FE-30 · Saved views](../features/FE-30-saved-views.md) — tests-pending
- [FE-31 · Bulk actions](../features/FE-31-bulk-actions.md) — tests-pending
- [FE-32 · Monitor templates and clone](../features/FE-32-monitor-templates-and-clone.md) — tests-pending
- [FE-37 · Onboarding](../features/FE-37-onboarding.md) — tests-pending

## Code
- `frontend/src/app/console/ConsoleApp.tsx`
- `frontend/src/app/console/consoleSource.ts`
- `frontend/src/domains/workspace/GroupList/GroupList.tsx`
- `frontend/src/app/console-main.tsx`

## Tests
- `frontend/src/app/console/ConsoleApp.test.tsx`
- `frontend/src/app/console/consoleSource.test.ts`
- `frontend/src/domains/workspace/GroupList/GroupList.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — monitor list with filter, view-only handling and demo fallback; en/pt-BR.
