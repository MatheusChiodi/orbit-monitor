---
id: FE-06
title: "Animation settings"
area: frontend
group: "Theming and personalization"
status: in-progress
screens: [preferences, wall]
spec: docs/05-extended-features.md §1.2
updated: 2026-10-22
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
- `frontend/src/shared/motion/animationLevel.tsx`
- `frontend/src/shared/motion/animationPrecedence.ts`
- `frontend/src/domains/wall/WallApp/WallApp.tsx`

## Tests
- `frontend/src/shared/motion/animationLevel.test.tsx`
- `frontend/src/shared/motion/animationPrecedence.test.ts`
- `frontend/src/domains/wall/WallApp/WallApp.layout.test.tsx`

## Decisions and notes
- Levels `off`, `minimal`, `standard` (default), `expressive`; `prefers-reduced-motion` forces `off`; `AnimationLevelProvider` marks `<html data-animation>`.
- Pending: level picker in device preferences (FE-50).
- Wall precedence implemented (`resolveAnimationLevel`): `?motion=` → layout `animationLevel` → FE-50 device level → BE-40 workspace default → standard; `AnimationLevelProvider` applies `prefers-reduced-motion` on top and marks `<html data-animation>`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — scope expanded from a 4-level switch to full animation settings (§1.2).
- 2026-10-18 — animation level provider and resolution (status: in-progress).
- 2026-10-18 — animation level provider and resolution (status: in-progress).
- 2026-10-22 — animation precedence on the wall (URL, layout, device, workspace).
