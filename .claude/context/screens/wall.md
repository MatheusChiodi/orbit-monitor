---
screen: wall
title: "Wall (TV mode)"
route: "wall.html"
status: in-progress
spec: docs/03-design.md §3
updated: 2026-10-18
---

# Wall (TV mode)

## Purpose
Header with global status and clock, hero (incident / all operational), also active, near threshold, monitor matrix, timeline, acknowledge.

## Layout and components
- `WallApp` (store + feed + clock + operator) → `WallScreen`
  - `WallHeader`: brand, environment, global status pill (`aria-live`), counters, updated, clock, fullscreen
  - left column (action): `Hero` / `HeroCalm` (swapped with `AnimatePresence` + `layoutId`), then `AlsoActive` and `NearLimit`
  - right column (context): `MonitorMatrix`, `Timeline`
- Layout CSS in `frontend/src/app/theme.css` (`.wall-layout`): full 16:9 grid at ≥ 1100 px and wider than 4:3, otherwise one scrollable column in phone order
- Entry: `frontend/wall.html` → `frontend/src/app/wall-main.tsx` (locale from `?lang=`, layout from `/wall/<slug>`)

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-05 · State, hysteresis, uptime and p95](../features/CORE-05-state-hysteresis-uptime-and-p95.md) — done
- [CORE-06 · Incidents and acknowledgement](../features/CORE-06-incidents-and-acknowledgement.md) — in-progress
- [CORE-07 · Workspaces and groups](../features/CORE-07-workspaces-and-groups.md) — in-progress
- [CORE-20 · Local-first runtime](../features/CORE-20-local-first-runtime.md) — in-progress
- [CORE-09 · Realtime wall updates](../features/CORE-09-realtime-wall-updates.md) — in-progress
- [CORE-11 · Global status summary](../features/CORE-11-global-status-summary.md) — done
- [CORE-12 · Value formatting](../features/CORE-12-value-formatting.md) — done
- [CORE-13 · Threshold rule, headroom and deviation](../features/CORE-13-threshold-rule-headroom-and-deviation.md) — done
- [CORE-15 · Internationalization (en / pt-BR)](../features/CORE-15-internationalization-en-pt-br.md) — in-progress
- [CORE-16 · Sensitive data protection (LGPD / PCI DSS)](../features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) — in-progress
- [CORE-17 · Design tokens and base theme](../features/CORE-17-design-tokens-and-base-theme.md) — done
- [FE-06 · Animation level](../features/FE-06-animation-level.md) — tests-pending
- [FE-07 · Density](../features/FE-07-density.md) — tests-pending
- [FE-08 · Viewing distance scale](../features/FE-08-viewing-distance-scale.md) — tests-pending
- [FE-09 · Night mode schedule](../features/FE-09-night-mode-schedule.md) — tests-pending
- [FE-10 · Workspace branding](../features/FE-10-workspace-branding.md) — tests-pending
- [FE-13 · Reorder monitors and groups](../features/FE-13-reorder-monitors-and-groups.md) — tests-pending
- [FE-21 · Visualization picker](../features/FE-21-visualization-picker.md) — planned
- [FE-22 · Compatibility rules](../features/FE-22-compatibility-rules.md) — planned
- [FE-23 · Visualization settings](../features/FE-23-visualization-settings.md) — planned
- [FE-24 · 20 display modes](../features/FE-24-20-display-modes.md) — planned
- [FE-25 · Week-over-week overlay](../features/FE-25-week-over-week-overlay.md) — planned
- [FE-26 · Chart annotations](../features/FE-26-chart-annotations.md) — planned
- [FE-27 · Zoom and synced crosshair](../features/FE-27-zoom-and-synced-crosshair.md) — planned
- [FE-40 · Escalation countdown](../features/FE-40-escalation-countdown.md) — planned
- [FE-45 · Kiosk mode](../features/FE-45-kiosk-mode.md) — planned
- [FE-46 · Stale data indicator](../features/FE-46-stale-data-indicator.md) — planned
- [FE-47 · Sound alerts](../features/FE-47-sound-alerts.md) — planned

## Code
- `frontend/src/domains/wall/WallApp/WallApp.tsx`
- `frontend/src/domains/wall/components/`
- `frontend/src/domains/wall/selectors/selectors.ts`
- `frontend/src/domains/wall/store/wallStore.ts`
- `frontend/src/domains/wall/feed/wallFeed.ts`
- `frontend/src/domains/wall/mock/mockSnapshot.ts`
- `frontend/src/app/wall-main.tsx`

## Tests
- `frontend/src/domains/wall/WallApp/WallApp.test.tsx`
- `frontend/src/domains/wall/components/*/*.test.tsx`
- `frontend/src/domains/wall/selectors/selectors.test.ts`
- `frontend/src/domains/wall/store/wallStore.test.ts`
- `frontend/src/domains/wall/feed/wallFeed.test.ts`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — wall built: header, hero/calm hero, also active, near threshold, matrix, timeline, acknowledge; en/pt-BR.
