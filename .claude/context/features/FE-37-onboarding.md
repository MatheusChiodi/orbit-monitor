---
id: FE-37
title: "Onboarding"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list, settings]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-37 · Onboarding

## Summary
Guided first monitor and helpful empty states

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md), [settings](../screens/settings.md)

## Code
- `frontend/src/domains/workspace/Onboarding/Onboarding.tsx`
- `frontend/src/domains/workspace/Onboarding/onboardingSteps.ts`

## Tests
- `frontend/src/domains/workspace/Onboarding/Onboarding.test.tsx`

## Decisions and notes
- `Onboarding` is the empty state of the Monitors screen while nothing besides the built-in health check (`orbit_self`, type `SELF`, BE-50) exists: "Nothing in orbit yet", one sentence and two start tiles (Monitor a URL → `#/monitors/new/HTTP`, Monitor a SELECT → `#/monitors/new/SQL`), each with a description. The two "Play intro" boxes are gone.
- The step list was dropped from the card (on an empty install every step is undone, so it was noise); `onboardingSteps` stays as a pure helper.
- View-only clients read where monitors are added instead of the tiles.
- The workspace `EmptyState` was removed (orphan); screens use `EmptyState` from `@/shared/ui`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — onboarding and empty states (status: done).
- 2026-10-22 — the empty state ignores the built-in `orbit_self` monitor, so a fresh install shows the guides.
- 2026-10-24 — onboarding is the Monitors empty state (title, two start tiles); orphan workspace EmptyState removed.
