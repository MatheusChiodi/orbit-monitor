---
id: FE-51
title: "Component motion system"
area: frontend
group: "Theming and personalization"
status: done
screens: [wall, monitor-list, monitor-editor-http, monitor-editor-sql, data-and-display, layout-editor, theme-editor, preferences, incidents, incident-detail, settings]
spec: docs/03-design.md §4.1
updated: 2026-10-22
---

# FE-51 · Component motion system

## Summary
Every component animates enter, exit, status change (OK/WARN/DOWN), value change, threshold crossing, reorder, expand/collapse, loading and drag, using shared motion tokens and presets, scaled by the animation level (FE-06) and disabled by `prefers-reduced-motion`.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
All screens (see frontmatter).

## Code
- `frontend/src/shared/motion/tokens.ts`
- `frontend/src/shared/motion/presets.ts`
- `frontend/src/shared/motion/useMotionPreset.ts`
- `frontend/src/shared/motion/useValueFlash.ts`
- `frontend/src/test/motion.tsx`
- `frontend/src/shared/motion/useChangeSignal.ts`
- `frontend/src/shared/motion/motionFeatures.ts`
- `frontend/src/shared/ui/Button/Button.tsx`
- `frontend/src/shared/ui/Panel/Panel.tsx`
- `frontend/src/shared/ui/Badge/Badge.tsx`
- `frontend/src/shared/ui/StatusPill/StatusPill.tsx`
- `frontend/src/shared/ui/Sparkline/Sparkline.tsx`
- `frontend/src/shared/ui/ThresholdChart/ThresholdChart.tsx`
- `frontend/src/app/theme.css`
- `frontend/src/shared/ui/FlashValue/FlashValue.tsx`
- `frontend/src/shared/ui/AnimatedItem/AnimatedItem.tsx`
- `frontend/src/domains/wall/components/`
- `frontend/src/domains/workspace/GroupList/GroupList.tsx`
- `frontend/src/domains/monitor/components/`
- `frontend/src/app/console/ScreenTransition/ScreenTransition.tsx`

## Tests
- `frontend/src/shared/motion/tokens.test.ts`
- `frontend/src/shared/motion/presets.test.ts`
- `frontend/src/shared/motion/useValueFlash.test.tsx`
- `frontend/src/shared/motion/motion.lazy.test.tsx`
- `frontend/src/shared/ui/Button/Button.motion.test.tsx`
- `frontend/src/shared/ui/Panel/Panel.motion.test.tsx`
- `frontend/src/shared/ui/Badge/Badge.motion.test.tsx`
- `frontend/src/shared/ui/StatusPill/StatusPill.motion.test.tsx`
- `frontend/src/shared/ui/Sparkline/Sparkline.motion.test.tsx`
- `frontend/src/shared/ui/ThresholdChart/ThresholdChart.motion.test.tsx`
- `frontend/src/shared/ui/FlashValue/FlashValue.test.tsx`
- `frontend/src/domains/wall/components/*/*.motion.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.motion.test.tsx`
- `frontend/src/domains/monitor/components/*/*.motion.test.tsx`
- `frontend/src/app/console/ScreenTransition/ScreenTransition.motion.test.tsx`
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.safeMode.motion.test.tsx`
- `frontend/src/shared/motion/motionSettingsContext.test.tsx`

## Decisions and notes
- Only `opacity`, `transform` and colors are animated; no springs; translate ≤ 8 px; numbers never count.
- Tokens are frozen (`MOTION`); `motionPreset(level, kind)` returns Motion props (`initial/animate/exit/transition`) per moment: `off` = no initial state and zero duration, `minimal` = opacity/color only, `expressive` = ×1.25 durations and 45 ms stagger.
- Test contract: animated roots expose `data-motion-level`; enter = inline `opacity: 0` at mount (static when `off`); exits always go through `AnimatePresence`; status pills cross-fade their label and the dot pulses once (`data-pulse="once"`); value changes set `data-flash="up|down"` for 600 ms; list items carry `data-motion="listItem"`/`"reorder"`.
- Helpers for tests live in `@/test/motion` (`renderWithMotion`, `flushMotion`, `entersAnimated`, `isStatic`).
- Tailwind needs literal classes, so `duration-[120ms]` / `duration-[400ms]` mirror `MOTION.duration.instant` / `slow`; `transition-none` when the level is off.
- One-shot signals (dot pulse, sparkline new-point draw) come from `useChangeSignal`; keyframes `anim-pulse-once`, `anim-draw`, `anim-shimmer` live in `theme.css` and are disabled by `prefers-reduced-motion`.
- `FlashValue` swaps numbers in place with a 600 ms up/down tint (`anim-flash-up/down`); `AnimatedItem` is the shared `<li>` with the list preset, 30 ms stagger and an ease-in-out `layout` transition for reorderable lists.
- Hero swap: the old and new hero are stacked in the same grid cell and cross-fade (sync `AnimatePresence`), replacing the earlier wait-mode `layoutId` swap.
- The "All systems operational" ring and the timeline highlight need the standard level or above; the owner-less DOWN blink stays at every level as a state signal.
- `AnimatedItem` renders `li`, `tr` or `div`; console rows (group list, preview, conditions, fields) enter, leave and reorder through it.
- The preview shows a shimmering skeleton (`role=status`, `aria-busy`) while it runs; the Data & display section expands into view; condition verdicts cross-fade.
- `entersAnimated` accepts any opacity below 1 so tests do not race Motion's progress in jsdom.
- Bundle: components use `m.*` and `MotionProvider` wraps `LazyMotion` whose features (`domMax`: animations, exit, layout) load in their own chunk after first paint. Full `motion.*` pulled every feature into the wall's first load (≈ 28 KB gzip). Alternatives: `LazyMotion` with sync `domAnimation` (smaller saving, no layout animations) or keeping `motion` and missing the 150 KB wall budget. Source: https://motion.dev/docs/react-reduce-bundle-size. Guard: `motion.lazy.test.tsx` fails when a component imports `motion` (shared/viz excluded: its dev gallery has no provider). Tests resolve `m` to `motion` in `src/test/setup.ts` because components are mounted without the provider.
- New wall blocks (layout grid, clock, metric, series, indicators, table, text) reuse the animated `Panel`, `FlashValue`, `Sparkline` and `NearLimit`; layouts of a playlist cross-fade with the hero preset.
- Console screens enter with the enter preset on every route change (`ScreenTransition`); new lists (incidents, steps, SLA rows) use `AnimatedItem`; FE-06 switches and speed apply to every preset through `useMotionPreset`.
- Wall budget (2026-10-22): first load of `wall.html` is 149.8 KB gzip (static imports + CSS, the `wall-performance` e2e measure, now enabled). Off the critical path: Motion features, the living orb and header mini orb, the hero threshold chart, the layout grid, header controls, kiosk, night overlay, desktop notifications, demo data, feature API clients and the logo sanitizer. `package.json` declares `sideEffects: ["**/*.css"]` so unused barrel exports drop out, React/i18next share one `runtime` chunk, and the wall uses its own Tailwind entry (`app/wall.css` → `app/base.css`).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests for tokens, presets, value flash and every existing component (status: tests-pending).
- 2026-10-18 — motion tokens, presets per level, `useMotionPreset` and `useValueFlash` (status: in-progress).
- 2026-10-18 — motion tokens, presets per level, `useMotionPreset` and `useValueFlash` (status: in-progress).
- 2026-10-18 — shared UI components animated (Button, Panel, Badge, StatusPill/StatusDot, Sparkline, ThresholdChart).
- 2026-10-18 — shared UI components animated (Button, Panel, Badge, StatusPill/StatusDot, Sparkline, ThresholdChart).
- 2026-10-18 — wall components animated (hero, calm hero, matrix, timeline, also active, near threshold, acknowledge, header, wall screen loading skeleton).
- 2026-10-18 — console components animated (group list, monitor form, preview table, conditions, data step, SQL editor) (status: in-progress).
- 2026-10-22 — `m` components + `LazyMotion` (features chunk after first paint) to fit the wall budget.
- 2026-10-22 — every listed component animated, no pending tests (status: done).
- 2026-10-22 — route transitions, FE-06 settings applied to every preset, stale pending entries removed (status: done).
- 2026-10-22 — wall first load 149.8 KB gzip (lazy chunks, runtime chunk, wall-only CSS).
