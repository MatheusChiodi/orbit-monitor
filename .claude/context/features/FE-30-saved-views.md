---
id: FE-30
title: "Saved views"
area: frontend
group: "Console productivity"
status: planned
screens: [monitor-list]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-30 · Saved views

## Summary
Saved filters by group, tag and state in the monitor list

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- Parked: `frontend/src/domains/workspace/SavedViews/` was removed in the 2026-10-24 redesign (it was never mounted); recover it from commit `33110a0`.

## Tests
- None while parked.

## Decisions and notes
- 2026-10-24 redesign: parked. The component was only used by its own tests; it comes back when a screen needs it.
- Saved views are device-only UI filters (state, group, tag, text) in `localStorage` (`orbit.savedViews`); `sanitizeView` keeps only filter fields, never probe data.
- The pure module is `viewFilters.ts` (a `savedViews.ts` next to `SavedViews.tsx` collides on case-insensitive file systems).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — saved views (status: done).
- 2026-10-24 — parked: unused code removed in the console redesign (status: planned).
