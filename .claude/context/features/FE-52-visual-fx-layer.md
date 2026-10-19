---
id: FE-52
title: "Visual FX layer (3D, glass, Remotion)"
area: frontend
group: "Theming and personalization"
status: planned
screens: [wall, monitor-list, settings, preferences, data-and-display, layout-editor]
spec: docs/03-design.md §4.2
updated: 2026-10-18
---

# FE-52 · Visual FX layer (3D, glass, Remotion)

## Summary
Distinctive "web3" look: live 3D orb in the calm hero (React Three Fiber), low-contrast animated background, glass panels with gradient borders, restrained DOWN glow, and Remotion compositions (`@remotion/player`, `@remotion/three`) for intro, onboarding and empty states. Gated by the animation level; data always stays flat and legible; lazy-loaded.

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [monitor-list](../screens/monitor-list.md), [settings](../screens/settings.md), [preferences](../screens/preferences.md)

## Code
_None yet._ Planned: `frontend/src/shared/fx/`, `frontend/remotion/`.

## Tests
_None yet._

## Decisions and notes
- Owned by fx-agent; integration into existing components is coordinated with frontend-agent.
- Remotion is used for compositions (player/video), not for live UI state; live 3D uses React Three Fiber; micro-interactions stay on Motion (FE-51).

## Changelog
- 2026-10-18 — context file created (status: planned).
