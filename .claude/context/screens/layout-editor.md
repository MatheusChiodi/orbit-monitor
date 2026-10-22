---
screen: layout-editor
title: "Wall layout editor"
route: "index.html#/layouts/:id"
status: done
spec: docs/05-extended-features.md FE-11..FE-20
updated: 2026-10-22
---

# Wall layout editor

## Purpose
12-column drag-and-drop grid, block settings, screen previews, incident simulator, undo/redo.

## Layout and components
- Route `index.html#/layouts` and `#/layouts/<id>` (header button "Wall layouts") → `LayoutsPage`
  - layout list (nav) + "New layout" (free `layout-N` slug, NOC template)
  - `LayoutSettings`: name, slug, FE-05 theme, FE-06 animation override, FE-19 playlist (layout + seconds rows)
  - `BlockSettings`: per-block source (monitor/group), FE-58 history window for series, text
  - `LayoutEditor` inside a scoped theme preview (`data-theme-preview`, `themeStyle`) so the grid shows the layout theme
  - "Open on the wall" link `/wall/<slug>`; view-only clients get a read-only grid and disabled settings

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — in-progress
- [FE-11 · Wall layout editor](../features/FE-11-wall-layout-editor.md) — done
- [FE-12 · Keyboard drag and drop](../features/FE-12-keyboard-drag-and-drop.md) — done
- [FE-15 · Undo/redo](../features/FE-15-undo-redo.md) — done
- [FE-16 · Layout templates](../features/FE-16-layout-templates.md) — done
- [FE-17 · Incident simulator](../features/FE-17-incident-simulator.md) — done
- [FE-18 · Screen previews](../features/FE-18-screen-previews.md) — done
- [FE-19 · Layout playlist](../features/FE-19-layout-playlist.md) — done
- [FE-20 · Video wall tiling](../features/FE-20-video-wall-tiling.md) — done

## Code
- `frontend/src/app/console/LayoutsPage/LayoutsPage.tsx`
- `frontend/src/domains/workspace/LayoutSettings/LayoutSettings.tsx`
- `frontend/src/domains/workspace/BlockSettings/BlockSettings.tsx`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.tsx`

## Tests
- `frontend/src/app/console/ConsoleApp.theming.test.tsx`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — console route, layout settings (theme, animation, playlist), block settings and themed preview.
- 2026-10-22 — routes via `routes.ts` (`#/layouts`, `#/layouts/<id>`); settings persisted by BE-41.
