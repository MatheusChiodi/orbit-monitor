---
id: FE-49
title: "Mobile on-call view"
area: frontend
group: "Wall runtime and preferences"
status: done
screens: [mobile-on-call]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-49 · Mobile on-call view

## Summary
Hero, active incidents and a full-width Acknowledge button

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[mobile-on-call](../screens/mobile-on-call.md)

## Code
- `frontend/src/domains/wall/components/OnCallView/OnCallView.tsx`
- `frontend/src/domains/wall/WallApp/WallApp.tsx`
- `frontend/src/shared/hooks/useMediaQuery.ts`
- `frontend/src/domains/wall/components/AcknowledgeButton/AcknowledgeButton.tsx`

## Tests
- `frontend/src/domains/wall/components/OnCallView/OnCallView.test.tsx`
- `frontend/src/domains/wall/WallApp/WallApp.test.tsx`
- `frontend/src/shared/hooks/useMediaQuery.test.ts`

## Decisions and notes
- Below 640 px the wall renders `OnCallView`: the worst problem with a full-width Acknowledge (`min-h-[2.75rem]`) and the list of active incidents; no matrix or timeline.
- Calm state shows "All systems operational" without any action.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — mobile on-call view (status: done).
