---
id: FE-06
title: "Animation settings"
area: frontend
group: "Theming and personalization"
status: tests-pending
screens: [preferences, wall]
spec: docs/05-extended-features.md §1.2
updated: 2026-10-18
---

# FE-06 · Animation settings

## Summary
Settings → Animation: preset level (off/minimal/standard/expressive/custom), intensity 0–100 %, speed 0.5–1.5×, per-category switches (transitions, feedback, attention signals, 3D/FX, background, intros, hover/drag), live preview with incident simulation; per device, workspace defaults, wall-layout override and `?motion=`; `prefers-reduced-motion` forces off; auto-downgrade on slow frames. Single source of truth `useMotionSettings()` for FE-51 and FE-52.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [wall](../screens/wall.md)

## Code
_None yet._

## Tests
- `frontend/src/shared/motion/animationLevel.pending.test.tsx`

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — scope expanded from a 4-level switch to full animation settings (§1.2).
