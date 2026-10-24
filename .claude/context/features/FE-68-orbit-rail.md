---
id: FE-68
title: "Orbit rail"
area: frontend
group: "Console redesign"
status: done
screens: [monitor-list]
spec: docs/03-design.md
updated: 2026-10-24
---

# FE-68 · Orbit rail

## Summary
72 px signature band atop the monitor list: an elliptical SVG track where every monitor is a satellite colored by state, with a one-line summary next to it. Replaces the ~330 px 3D orb and the intro boxes.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/domains/workspace/OrbitRail/OrbitRail.tsx`
- `frontend/src/domains/workspace/OrbitRail/railLayout.ts`

## Tests
- `frontend/src/domains/workspace/OrbitRail/OrbitRail.test.tsx`
- `frontend/src/domains/workspace/OrbitRail/railLayout.test.ts`

## Decisions and notes
- Inline SVG drawn at the measured width (ResizeObserver; 960 px fallback) so dots stay round; no new dependency. Alternatives considered: keep the R3F `LivingOrb` (heavy, 330 px, not keyboard friendly) or a canvas (no native focus targets). SVG `<a>` satellites give real links and focus.
- Layout (`railLayout`): Down monitors first, centered at 12 o'clock; the rest clockwise in group order with an empty slot between groups so each group reads as an arc; the step is capped at 22° so a few monitors cluster at the top.
- The built-in `SELF` health check is excluded from the satellites and from the summary ("1 down · 2 warnings · 17 OK", "All N monitors OK", or "Nothing in orbit yet").
- Keyboard: one tab stop (roving tabindex); arrows / Home / End move, Enter or Space opens; hover or focus shows a tooltip with name and value (values via `formatReading`, names via `safeText`).
- Motion: only Down satellites pulse (motion `m.circle`, opacity + radius loop), and only at the `standard` / `expressive` animation levels; `prefers-reduced-motion` already resolves the level to `off`.

## Changelog
- 2026-10-24 — context file created; orbit rail on the Monitors screen (status: done).
- 2026-10-24 — empty install: the rail says "No monitors yet" (the onboarding card carries "Nothing in orbit yet"); the header hides Add monitor while the onboarding tiles are shown.
