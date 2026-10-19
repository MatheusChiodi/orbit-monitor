---
id: FE-52
title: "Visual FX layer (3D, glass, Remotion)"
area: frontend
group: "Theming and personalization"
status: in-progress
screens: [wall, monitor-list, settings, preferences, data-and-display, layout-editor]
spec: docs/03-design.md §4.2
updated: 2026-10-18
---

# FE-52 · Visual FX layer (3D, glass, Remotion)

## Summary
Distinctive "web3" look: live 3D orb in the calm hero (React Three Fiber), low-contrast animated background, glass panels with gradient borders, restrained DOWN glow, and Remotion compositions (`@remotion/player`, `@remotion/three`) for intro, onboarding and empty states. Gated by the animation level; data always stays flat and legible; lazy-loaded.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [monitor-list](../screens/monitor-list.md), [settings](../screens/settings.md), [preferences](../screens/preferences.md)

## Code
- `frontend/src/shared/fx/fxLevel.ts` — `resolveFx()`: the single decision of which effects run per level
- `frontend/src/shared/fx/frameMonitor.ts` — EMA frame-time monitor (> 20 ms for 3 s → downgrade)
- `frontend/src/shared/fx/FxProvider.tsx` — `FxProvider` / `useFxLevel()`, sets `<html data-fx>`
- `frontend/src/shared/fx/fx.css` — glass, tilt sheen, DOWN glow, static backdrop (gated by `html[data-fx]`)

## Tests
- `frontend/src/shared/fx/fxLevel.test.ts`
- `frontend/src/shared/fx/frameMonitor.test.ts`
- `frontend/src/shared/fx/FxProvider.test.tsx`

## Decisions and notes
- Owned by fx-agent; integration into existing components is coordinated with frontend-agent.
- Remotion is used for compositions (player/video), not for live UI state; live 3D uses React Three Fiber; micro-interactions stay on Motion (FE-51).
- Level source: `FxProvider level` prop, else `?motion=`, else `<html data-animation>` (FE-06), else `standard`. `prefers-reduced-motion` forces `off`. Swap to `useMotionSettings()` once FE-06 lands.
- Gating: `off`/`minimal` → static backdrop, no 3D, glass or tilt; `standard` → orb, glass, low background, tilt ≤ 2.5°; `expressive` → full background, tilt 4°, Remotion intros. DOWN glow: none / static / pulse.
- Frame monitor smooths frame time (EMA, α 0.1), ignores gaps > 500 ms (hidden tab) and fires once; `restore()` is the "Try again" path. It only runs while something animates.
- CSS gating via `html[data-fx]` keeps the components free of level checks for pure styling; the stylesheet is unlayered so it overrides Tailwind utilities only when FX is on.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — FX level, frame monitor and provider with tests; glass/glow stylesheet (status: in-progress).
