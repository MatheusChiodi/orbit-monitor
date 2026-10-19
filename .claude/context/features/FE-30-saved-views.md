---
id: FE-30
title: "Saved views"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-30 · Saved views

## Summary
Saved filters by group, tag and state in the monitor list

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/domains/workspace/SavedViews/SavedViews.tsx`
- `frontend/src/domains/workspace/SavedViews/viewFilters.ts`

## Tests
- `frontend/src/domains/workspace/SavedViews/SavedViews.test.tsx`

## Decisions and notes
- Saved views are device-only UI filters (state, group, tag, text) in `localStorage` (`orbit.savedViews`); `sanitizeView` keeps only filter fields, never probe data.
- The pure module is `viewFilters.ts` (a `savedViews.ts` next to `SavedViews.tsx` collides on case-insensitive file systems).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — saved views (status: done).
