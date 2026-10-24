---
screen: wall
title: "Wall (TV mode)"
route: "wall.html"
status: in-progress
spec: docs/03-design.md §3
updated: 2026-10-24
---

# Wall (TV mode)

## Purpose
Header with global status and clock, hero (incident / all operational), also active, near threshold, monitor matrix, timeline, acknowledge.

## Layout and components
- `WallApp` (store + feed + clock) → `WallScreen`
  - `WallHeader`: brand (`WorkspaceBrand` with sanitized logo when the snapshot has `branding`, FE-10), environment, global status pill (`aria-live`), counters, updated, clock, sound switch (`role="switch"`, speaker icon, visible name "Sound alerts", on/off track), fullscreen icon; desktop notifications only for clients with edit access and never in kiosk
  - left column (action): `Hero` / `HeroCalm` (swapped with `AnimatePresence` + `layoutId`), then `AlsoActive` and `NearLimit`
  - right column (context): `MonitorMatrix`, `Timeline`
- Layout CSS in `frontend/src/app/theme.css` (`.wall-layout`): full 16:9 grid at ≥ 1100 px and wider than 4:3, otherwise one scrollable column in phone order
- `NightModeOverlay` (FE-09) above the screen when `?night=` is set; viewing distance (FE-08) via `--wall-scale` (`?scale=` → device preference → 3 m)
- Entry: `frontend/wall.html` → `frontend/src/app/wall-main.tsx` (locale from `?lang=`, layout from `?layout=` or `/wall/<slug>`; only the active language is loaded)
- Saved layouts (FE-11): `WallScreen` keeps the classic arrangement for the built-in NOC blocks and otherwise renders the lazy `LayoutGrid`; layouts of a playlist (FE-19) cross-fade inside `.wall-stage`
- TV overrides: `?theme=` (FE-05, `LazyThemeProvider`), `?motion=` (FE-06), `?tile=n/2|n/4` (FE-20, `TiledWall`)
- Hero countdown names the next escalation step (FE-40); clock blocks show who is on call (BE-33)
- Empty install (no monitors): `WallEmpty` replaces the five panels and the header says "No monitors yet" in grey (no counters, no false "All systems operational · 100.00%"), with the console address in full
- Type and tokens (2026-10-24 redesign): Archivo (`display-wide`) for the hero name and big numbers, Geist Mono for values, scale tokens only (no arbitrary Tailwind values); Acknowledge is the primary (signal) button, never the DOWN red; matrix names wrap to two lines (full name in `title`), tiles fill `repeat(auto-fill, minmax(10.5rem, 1fr))`; glass panels keep a neutral edge (no blue→green border)
- Budget: first load 148.5 KB gzip (2026-10-24, e2e method): header and hero are in the first load; Also active, Near threshold, matrix, timeline and the empty-install view arrive as lazy chunks right after first paint, each in its reserved grid slot; wall code imports `shared/ui` by deep paths; `app/wall.css` (wall-only Tailwind sources) and lazy chunks for orb, chart, controls, kiosk, night overlay, notifications, layout grid and API clients; only the wall's locale namespaces load
- `WallCustomization` (wall-main) reads workspace, layout and device customization, applies the look and renamed labels; Customize mode (FE-53) loads lazily for clients with edit access; `MonitorMatrix` tiles follow the FE-55 card settings and show a text state label for WARN/DOWN

## States
- Loading, empty install ("No monitors yet"), error, stale data; "Near threshold" empty says why: no numeric limit yet (with a hint) or waiting for the first readings
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
- [FE-06 · Animation level](../features/FE-06-animation-level.md) — in-progress
- [FE-07 · Density](../features/FE-07-density.md) — done
- [FE-08 · Viewing distance scale](../features/FE-08-viewing-distance-scale.md) — done
- [FE-09 · Night mode schedule](../features/FE-09-night-mode-schedule.md) — done
- [FE-10 · Workspace branding](../features/FE-10-workspace-branding.md) — done
- [FE-13 · Reorder monitors and groups](../features/FE-13-reorder-monitors-and-groups.md) — in-progress
- [FE-21 · Visualization picker](../features/FE-21-visualization-picker.md) — done
- [FE-22 · Compatibility rules](../features/FE-22-compatibility-rules.md) — done
- [FE-23 · Visualization settings](../features/FE-23-visualization-settings.md) — done
- [FE-24 · 20 display modes](../features/FE-24-20-display-modes.md) — done
- [FE-25 · Week-over-week overlay](../features/FE-25-week-over-week-overlay.md) — done
- [FE-26 · Chart annotations](../features/FE-26-chart-annotations.md) — done
- [FE-27 · Zoom and synced crosshair](../features/FE-27-zoom-and-synced-crosshair.md) — done
- [FE-40 · Escalation countdown](../features/FE-40-escalation-countdown.md) — done
- [FE-11 · Wall layout editor](../features/FE-11-wall-layout-editor.md) — done
- [FE-19 · Layout playlist](../features/FE-19-layout-playlist.md) — done
- [FE-20 · Video wall tiling](../features/FE-20-video-wall-tiling.md) — done
- [FE-05 · Per-layout theme](../features/FE-05-per-layout-theme.md) — done
- [FE-45 · Kiosk mode](../features/FE-45-kiosk-mode.md) — done
- [FE-46 · Stale data indicator](../features/FE-46-stale-data-indicator.md) — done
- [FE-47 · Sound alerts](../features/FE-47-sound-alerts.md) — done
- [FE-53 · Customize mode and inspector](../features/FE-53-customize-mode.md) — done
- [FE-55 · Card and component behavior settings](../features/FE-55-card-behavior-settings.md) — done

## Code
- `frontend/src/domains/wall/WallApp/WallApp.tsx`
- `frontend/src/domains/wall/components/`
- `frontend/src/domains/wall/selectors/selectors.ts` — also `nearLimitEmpty()`
- `frontend/src/domains/wall/components/WallEmpty/WallEmpty.tsx`
- `frontend/src/domains/wall/components/WallIcons/WallIcons.tsx`
- `frontend/src/domains/wall/store/wallStore.ts`
- `frontend/src/domains/wall/feed/wallFeed.ts`
- `frontend/src/domains/wall/mock/mockSnapshot.ts`
- `frontend/src/app/wall-main.tsx`
- `frontend/src/domains/wall/display/nightMode.tsx`
- `frontend/src/domains/wall/display/viewingScale.ts`
- `frontend/src/domains/workspace/WorkspaceBrand/WorkspaceBrand.tsx`
- `frontend/src/shared/ui/FlashValue/FlashValue.tsx`
- `frontend/src/shared/ui/AnimatedItem/AnimatedItem.tsx`
- `frontend/src/domains/wall/layout/`
- `frontend/src/domains/wall/components/LayoutGrid/LayoutGrid.tsx`
- `frontend/src/shared/theme/LazyThemeProvider.tsx`
- frontend/src/domains/customization/WallCustomization/WallCustomization.tsx

## Tests
- `frontend/src/domains/wall/WallApp/WallApp.test.tsx`
- `frontend/src/domains/wall/components/*/*.test.tsx`
- `frontend/src/domains/wall/selectors/selectors.test.ts`
- `frontend/src/domains/wall/store/wallStore.test.ts`
- `frontend/src/domains/wall/feed/wallFeed.test.ts`
- `frontend/src/domains/wall/display/*.test.ts(x)`
- `frontend/src/domains/wall/WallApp/WallApp.nightMode.test.tsx`
- `frontend/src/domains/wall/components/*/*.motion.test.tsx`
- `frontend/src/domains/wall/components/*/*.privacy.test.tsx`
- `frontend/src/domains/wall/WallApp/WallApp.layout.test.tsx`
- `frontend/src/domains/wall/layout/*.test.ts`
- frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.customization.test.tsx
- `frontend/src/domains/wall/components/WallControls/WallControls.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — wall built: header, hero/calm hero, also active, near threshold, matrix, timeline, acknowledge; en/pt-BR.
- 2026-10-18 — FE-51 motion on every wall component; probe values through SafeValue.
- 2026-10-22 — night mode overlay (FE-09), viewing distance scale (FE-08) and workspace brand in the header (FE-10).
- 2026-10-22 — saved layouts by slug, playlist cross-fade, `?theme=`/`?motion=`/`?tile=`, escalation step name, on-call clock, lazy chunks for the budget.
- 2026-10-22 — customization (look, labels, card settings, Customize mode for editors) on the wall.
- 2026-10-22 — first load under the 150 KB gzip budget; BE-41 persists layout theme, animation and playlist.
- 2026-10-22 — no backend: "Waiting for the Orbit server…" with retry; demo data only with `?demo`.
- 2026-10-22 — no `?operator=`: acknowledgements read "Acknowledged at HH:MM" / "Reconhecido às HH:MM".
- 2026-10-24 — redesign: honest empty install, wrapped matrix names, Acknowledge as primary, sound toggle with icon, notifications hidden on view-only/kiosk, Archivo/Geist Mono on the token scale, neutral glass edge, near-threshold empty reasons.
- 2026-10-24 — wall budget back under 150 KB: secondary panels and `WallEmpty` load lazily.
