---
id: CORE-17
title: "Design tokens and base theme"
area: frontend
group: "Theming"
status: done
screens: [wall]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-17 · Design tokens and base theme

## Summary
CSS variables for colors, fonts, fluid base size.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md)

## Code
- `frontend/src/app/theme.css`
- `frontend/src/shared/ui/tones.ts`

## Tests
- `frontend/src/app/theme.test.ts`

## Decisions and notes
- Tokens are CSS variables on `:root` and exposed to Tailwind v4 through `@theme` (`bg-down`, `text-ok-text`…).
- Fluid base `clamp(12px, .7vw + .45vh, 36px)`; the console uses a fixed 15 px; `prefers-reduced-motion` disables every animation.
- Fonts Inter Tight / Inter / Geist Mono (latin subset only, to keep the wall under 150 KB gzip); mono values use tabular-nums.

## Changelog
- 2026-10-18 — context file created (status: done).
- 2026-10-18 — file list completed (status: done).
