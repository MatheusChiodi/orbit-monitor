---
id: FE-37
title: "Onboarding"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list, settings]
spec: docs/05-extended-features.md
updated: 2026-10-22
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
- `frontend/src/domains/workspace/EmptyState/EmptyState.tsx`

## Tests
- `frontend/src/domains/workspace/Onboarding/Onboarding.test.tsx`

## Decisions and notes
- The first-monitor and check-flow guides show while the operator has not added any monitor; Orbit's built-in health check (`orbit_self`, type `SELF`, BE-50) does not count.
- First-steps progress comes from the config resources (missing file = empty list); done steps say "Done" in text; view-only clients get a note instead of start buttons.
- `EmptyState` is the shared helpful empty state (enters with the FE-51 preset).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — onboarding and empty states (status: done).
- 2026-10-22 — the empty state ignores the built-in `orbit_self` monitor, so a fresh install shows the guides.
