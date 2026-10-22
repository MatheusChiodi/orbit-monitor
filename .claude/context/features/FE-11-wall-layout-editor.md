---
id: FE-11
title: "Wall layout editor"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-11 · Wall layout editor

## Summary
12-column grid, snapping, resize handles, collision resolution

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/workspace/layout/grid.ts`
- `frontend/src/domains/workspace/layout/layoutsApi.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.tsx`
- `frontend/src/domains/workspace/layout/blockKinds.ts`
- `frontend/src/domains/wall/layout/wallLayout.ts`
- `frontend/src/domains/wall/layout/useWallLayouts.ts`
- `frontend/src/domains/wall/components/LayoutGrid/LayoutGrid.tsx`
- `frontend/src/domains/wall/components/HeroSwap/HeroSwap.tsx`
- `frontend/src/domains/wall/components/ClockBlock/ClockBlock.tsx`
- `frontend/src/domains/wall/components/MetricBlock/MetricBlock.tsx`
- `frontend/src/domains/wall/components/SeriesBlock/SeriesBlock.tsx`
- `frontend/src/domains/wall/components/IndicatorsBlock/IndicatorsBlock.tsx`
- `frontend/src/domains/wall/components/MonitorTable/MonitorTable.tsx`
- `frontend/src/domains/wall/components/TextBlock/TextBlock.tsx`
- `frontend/src/domains/alerting/oncall/oncallApi.ts`
- `frontend/src/app/console/LayoutsPage/LayoutsPage.tsx`
- `frontend/src/domains/workspace/LayoutSettings/LayoutSettings.tsx`
- `frontend/src/domains/workspace/BlockSettings/BlockSettings.tsx`

## Tests
- `frontend/src/domains/workspace/layout/grid.test.ts`
- `frontend/src/domains/workspace/layout/layoutsApi.test.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.test.tsx`
- `frontend/src/domains/wall/layout/wallLayout.test.ts`
- `frontend/src/domains/wall/layout/useWallLayouts.test.ts`
- `frontend/src/domains/wall/components/LayoutGrid/LayoutGrid.test.tsx`
- `frontend/src/domains/wall/WallApp/WallApp.layout.test.tsx`
- `frontend/src/domains/alerting/oncall/oncallApi.test.ts`
- `frontend/src/app/console/ConsoleApp.theming.test.tsx`

## Decisions and notes
- 12-column grid with snapping; blocks stay inside the columns and overlapped blocks cascade down, so layouts never overlap.
- Layouts are read and saved only through `/api/layouts` (`{version, items}`, missing file = empty, `PUT /api/layouts/{id}`); view-only grids are `aria-readonly` without Save.
- Wall rendering: `wall.html?layout=<slug>` or `/wall/<slug>` loads `GET /api/layouts/{slug}` (404/offline = built-in NOC blocks). The built-in arrangement keeps the hand-tuned classic wall; any other layout renders `LayoutGrid` (12 columns at ≥ 1100 px and wider than 4:3, one column in reading order otherwise), loaded lazily so the classic wall stays within budget. Every block kind renders: hero, also active, near limit, ranking (near-limit list, 10 items), matrix, timeline, clock (with BE-33 `GET /api/oncall/now`, refreshed every 5 min), uptime, value, series (live 60 min or a FE-58 history range), indicators, live table (monitor name/state/value only; the snapshot never carries result rows) and text (plain text through the redactor).
- API normalization (`normalizeLayout`): accepts the BE-41 list shape (plain array) or `{ version, items }`, blocks as `{ type }` or `{ kind }` with optional `id`; unknown kinds and invalid overrides are dropped. Saves send `type` next to `kind` so the backend record keeps the block. Optional fields `themeId`, `animationLevel`, `playlist` and per-block `source`, `range`, `text` are the assumed BE-41 contract (orbit.layouts.json).
- Console route `index.html#/layouts` / `#/layouts/<id>` (`routes.ts` `layouts`/`layout`, rendered by `ConsoleRoutes` → `LayoutsPage`): list, new layout (free `layout-N` slug), settings (name, slug, theme, animation, playlist), per-block options (source, series range, text), themed preview of the grid, "Open on the wall", read-only for view-only clients. Clock blocks take on-call from `WallSnapshot.onCall` (REST `/api/oncall/now` only for older backends).
- Backend gap (be-workspace): BE-41 still stores layouts as `{id, slug, name, version, blocks[{type,x,y,w,h,source,field,display}]}`: `themeId`, `animationLevel`, `playlist` and block `id`/`range`/`text` are dropped on save by the backend. Grid, kinds, positions and `source` persist today.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — layout editor, grid and layouts API client (status: in-progress).
- 2026-10-22 — wall renders saved layouts by slug (LayoutGrid, all block kinds, on-call clock).
- 2026-10-22 — console route for the layout editor; block options (status: done; extra fields need BE-41).
