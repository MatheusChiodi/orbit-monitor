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
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [wall](../screens/wall.md)

## Code
- `frontend/src/shared/motion/animationLevel.tsx`
- `frontend/src/shared/motion/motionSettings.ts`
- `frontend/src/shared/motion/useMotionPreset.ts`
- `frontend/src/domains/workspace/MotionSettingsPanel/MotionSettingsPanel.tsx`
- `frontend/src/shared/preferences/preferences.ts`
- `frontend/src/app/console/ConsoleApp.tsx`
- `frontend/src/app/theme.css`
- `frontend/src/domains/wall/WallApp/WallApp.tsx`
- `frontend/src/domains/workspace/LayoutSettings/LayoutSettings.tsx`

## Tests
- `frontend/src/domains/wall/WallApp/WallApp.layout.test.tsx`
- `frontend/src/shared/motion/animationLevel.test.tsx`
- `frontend/src/shared/motion/motionSettings.test.ts`
- `frontend/src/shared/motion/motionSettingsContext.test.tsx`
- `frontend/src/domains/workspace/MotionSettingsPanel/MotionSettingsPanel.test.tsx`
- `frontend/src/shared/preferences/preferences.motion.test.ts`
- `frontend/src/app/console/ConsoleApp.motion.test.tsx`

## Decisions and notes
- Levels `off`, `minimal`, `standard` (default), `expressive`; `prefers-reduced-motion` forces `off`; `AnimationLevelProvider` marks `<html data-animation>`.
- `motionSettings.ts` is the single model: presets map to intensity/speed/transitions/feedback/attention/fx/background/intros/hover exactly as §1.2; any device override makes the preset "custom"; `resolveMotion` applies the precedence reduced motion → `?motion=` → layout → device → workspace.
- `AnimationLevelProvider` carries the settings (`useMotionSettings()`); `useMotionPreset`, `AnimatedItem` and the toaster apply them (switches → instant, speed scales durations relative to the preset); `<html data-motion-attention|feedback|hover>` and `--motion-speed` let CSS-only signals follow (blink, flashes, pulse).
- Device preferences: the level select sets a preset (clears overrides); `MotionSettingsPanel` edits each control, "Reduce motion" sets minimal, and a live preview (status pill OK → WARNING → DOWN, value flash, simulated incident blink) renders with the same settings through `AnimationLevelScope`. Overrides persist per device in `orbit.preferences` (`motion`).
- Console: `?motion=` and the workspace defaults (`/api/settings/defaults`) feed the resolution; the 3D/FX control maps to the FX layer level (off → minimal, low → standard, high → expressive).
- Remaining (outside this scope): the FX layer (`shared/fx`, orbit-fx) does not yet read the background/intros switches or the intensity value separately from its level.
- Wall: `WallApp` resolves with the same `resolveMotion` (reduced motion → `?motion=` → layout `animationLevel` → device level + overrides → BE-40 workspace default) and passes the settings and the FX level down. The layout editor sets the layout override ("Animation on this wall"). The earlier wall-only `animationPrecedence.ts` was removed in favour of `motionSettings.ts`.
- The wall layout override is stored by BE-41 (`animationLevel`) and applied by `WallApp` through `resolveMotion`; the wall part of FE-06 is complete.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — scope expanded from a 4-level switch to full animation settings (§1.2).
- 2026-10-18 — animation level provider and resolution (status: in-progress).
- 2026-10-18 — animation level provider and resolution (status: in-progress).
- 2026-10-22 — full animation settings panel and model wired into the console (status: in-progress until the FX layer and wall layouts consume the remaining controls).
- 2026-10-22 — wall uses `resolveMotion` with the layout override from the layout editor.
- 2026-10-22 — layout animation override persisted by BE-41.
