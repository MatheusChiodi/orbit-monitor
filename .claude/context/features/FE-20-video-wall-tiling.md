---
id: FE-20
title: "Video wall tiling"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-20 · Video wall tiling

## Summary
`?tile=2/4` renders one tile of a 2×1 or 2×2 split

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/wall/tiling/tiling.ts`
- `frontend/src/domains/wall/TiledWall/TiledWall.tsx`
- `frontend/src/domains/wall/WallApp/WallApp.tsx`
- `frontend/src/app/theme.css`

## Tests
- `frontend/src/domains/wall/tiling/tiling.test.ts`
- `frontend/src/domains/wall/TiledWall/TiledWall.test.tsx`
- `frontend/src/domains/wall/WallApp/WallApp.layout.test.tsx`

## Decisions and notes
- `?tile=n/2` = 2×1, `?tile=n/4` = 2×2 (row-major, 1-based); `TiledWall` translates the full wall canvas inside an `overflow: hidden` area labelled "Tile n of N".
- Wired into `wall.html`: `WallApp` reads `?tile=` from the URL and wraps the wall in `TiledWall`; the canvas is the screen size × columns/rows (follows window resizes). `TiledWall` sets `--wall-canvas-height` so `.wall-root` fills the whole canvas, and the wall sets `--wall-tile-factor` (rows) on `<html>` so fonts scale with the canvas height (max 36 px × factor).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — video wall tiling (status: in-progress).
- 2026-10-22 — wired into wall.html (`?tile=`), canvas-sized wall and font scale (status: done).
