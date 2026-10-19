---
id: FE-46
title: "Stale data indicator"
area: frontend
group: "Wall runtime and preferences"
status: done
screens: [wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-46 · Stale data indicator

## Summary
Data age badge; wall greys out after N seconds without updates

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md)

## Code
- `frontend/src/domains/wall/components/StaleBadge/StaleBadge.tsx`
- `frontend/src/domains/wall/components/StaleBadge/staleness.ts`
- `frontend/src/domains/wall/store/wallStore.ts`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.tsx`
- `frontend/src/domains/wall/components/WallHeader/WallHeader.tsx`
- `frontend/src/app/theme.css`

## Tests
- `frontend/src/domains/wall/components/StaleBadge/StaleBadge.test.tsx`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.stale.test.tsx`
- `frontend/src/domains/wall/store/wallStore.test.ts`

## Decisions and notes
- The store records `lastUpdateAt` on every WebSocket message; after 60 s without messages the wall is `data-stale` (greyed out by CSS) and the header shows "Stale data · last update 2min 30s ago" in an `aria-live` status.
- Demo data never goes stale.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — stale data indicator (status: done).
- 2026-10-18 — stale data indicator (status: done).
- 2026-10-18 — stale data indicator (status: done).
