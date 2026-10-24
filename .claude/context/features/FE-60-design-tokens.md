---
id: FE-60
title: "Design tokens: quiet instrument palette, type and radius scales, fonts"
area: frontend
group: "Design system"
status: done
screens: [console, wall]
spec: docs/03-design.md
updated: 2026-10-24
---

# FE-60 · Design tokens

## Summary
Redesign foundation: Orbit Dark "quiet instrument" palette (grey surfaces, one accent, status colors only for status), `accent`/`on-accent` as Tailwind colors, `--text-*` and `--radius-*` scales, Archivo (display) + Geist (body) + Geist Mono (data) variable fonts, and FE-56 customization driven by tokens instead of class names.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/app/base.css` (tokens, `@theme`, fonts, `display-wide`, `section-label`)
- `frontend/src/app/theme.css` (console-only rules: glass off, select chevron, overlays, touch heights)
- `frontend/src/app/wall.css` (wall Tailwind scan, `@source not` for console-only code)
- `frontend/src/shared/theme/themes/orbit-dark.json`
- `frontend/src/shared/theme/applyTheme.ts` (`--on-accent`)
- `frontend/src/shared/preferences/density.ts` (root 15/16/17 px)
- `frontend/src/shared/customization/customization.css`

## Tests
- `frontend/src/app/theme.test.ts`
- `frontend/src/app/wall.css.test.ts`
- `frontend/src/shared/customization/customization.css.test.ts`
- `frontend/src/shared/theme/applyTheme.test.ts`, `registry.test.ts`, `contrast.test.ts`
- `frontend/src/shared/preferences/density.test.ts`

## Decisions and notes
- Palette: bg `#0b0e13`, s1 `#11151c`, s2 `#171c25`, s3 `#202734`, line `#242b37`, text `#e7ebf2`, muted `#9ba5b6`, dim `#677184`, accent = info `#6e9bff`, ok `#3fd38f`, warn `#f3b640`, down `#ff5a6a`. Passes the FE-02 contrast guard unchanged; the other 36 themes keep their token mapping.
- `--on-accent` is derived per theme (near-black, else white, else black) so primary buttons reach 4.5:1 in every built-in theme.
- Type scale in rem on a 16 px console root (density 15/16/17 px instead of 14/15/16) so `text-base` = 14 px as designed; overrides Tailwind's default `text-*` and `rounded-sm/md/lg` (none were in use).
- Fonts: `@fontsource-variable/archivo`, `geist`, `geist-mono` (OFL-1.1), one latin variable file each declared in base.css; Inter/Inter Tight stay as FE-56 choices in the console only. Alternatives considered: static `@fontsource/geist-sans` weights (more files and @font-face blocks), Inter Tight display (narrower, less distinctive).
- FE-56 hooks: radius → `--radius-*`, surfaces flat → `--surface-2/3`, shadows → `--panel-shadow` on `[data-surface="panel"]`, panel padding → `--panel-padding`, border → `.border`. A legacy radius block covers arbitrary `rounded-[..]` classes until markup migrates.
- Glass (FE-52) is wall-only: console panels are solid (`html.console[data-fx] .fx-glass` in theme.css).
- Wall budget: console-only primitives, console screens in scanned folders and `shared/viz` are excluded from the wall scan; `wall.css.test.ts` walks the wall import graph and fails if an excluded folder becomes reachable. Wall initial load measured 149.98 KB at a9c1f92, 148.96 KB after c6eeff2 (with other buckets' commits).

## Changelog
- 2026-10-24 — tokens, fonts, accent, scales and token-based customization hooks (status: done).
