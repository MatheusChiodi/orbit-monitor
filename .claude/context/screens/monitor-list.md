---
screen: monitor-list
title: "Monitor list"
route: "index.html#/monitors"
status: in-progress
spec: docs/02-features.md §1–2
updated: 2026-10-24
---

# Monitor list

## Purpose
Groups and monitors with state, filters, saved views, bulk actions.

## Layout and components
- `MonitorsScreen`: `PageHeader` ("Monitors", "…" menu with Reorder / Manage groups, primary "Add monitor"; edit mode only) → `OrbitRail` (FE-68) → `BulkActions` toolbar (when rows are selected) → `GroupList`
- Empty install (no monitor besides the hidden `SELF` check): empty rail + `Onboarding` ("Nothing in orbit yet", Monitor a URL / Monitor a SELECT); no filter, no "no match" text
- `GroupList`: text filter; one section per group (plus "Ungrouped" for monitors whose group is gone) with "N of M OK"; every group uses the same column widths: checkbox (edit) | Status (`StatusBadge`) | Name | Kind | Rule in plain words (expression in the tooltip) | Value (right, mono) | chevron link; whole row opens the monitor; below 640 px a two-line card (name, then status + kind)
- Detail `#/monitors/:id` (FE-69): header with state, kind, Open target link; Acknowledge / Edit / Pause-Resume / "…" (Duplicate, Delete); stats, last check, history chart with axes and limit, incidents
- `GroupManager` dialog: rename (keeps the order), delete empty groups, add groups (`PUT`/`DELETE /api/groups/{id}`)
- `GroupList` rows and group headers follow the FE-55 card settings (fields, variant, title, order, summary, empty text, click / double-click / long-press actions, inline expand); header has the Customize toggle (FE-53, editors only)

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-07 · Workspaces and groups](../features/CORE-07-workspaces-and-groups.md) — done
- [FE-13 · Reorder monitors and groups](../features/FE-13-reorder-monitors-and-groups.md) — done
- [FE-28 · Command palette](../features/FE-28-command-palette.md) — done
- [FE-29 · Keyboard shortcuts](../features/FE-29-keyboard-shortcuts.md) — done
- [FE-30 · Saved views](../features/FE-30-saved-views.md) — done
- [FE-31 · Bulk actions](../features/FE-31-bulk-actions.md) — done
- [FE-32 · Monitor templates and clone](../features/FE-32-monitor-templates-and-clone.md) — done
- [FE-37 · Onboarding](../features/FE-37-onboarding.md) — done
- [FE-53 · Customize mode and inspector](../features/FE-53-customize-mode.md) — done
- [FE-55 · Card and component behavior settings](../features/FE-55-card-behavior-settings.md) — done
- [FE-68 · Orbit rail](../features/FE-68-orbit-rail.md) — done
- [FE-69 · Monitor detail actions and history chart](../features/FE-69-monitor-detail-actions.md) — done

## Code
- `frontend/src/app/console/ConsoleApp.tsx`
- `frontend/src/app/console/consoleSource.ts`
- `frontend/src/domains/workspace/GroupList/GroupList.tsx`
- `frontend/src/app/console-main.tsx`
- `frontend/src/app/console/screens/MonitorsScreen/MonitorsScreen.tsx`
- `frontend/src/domains/workspace/GroupOrderEditor/GroupOrderEditor.tsx`
- `frontend/src/domains/workspace/OrbitRail/OrbitRail.tsx`
- `frontend/src/domains/workspace/BulkActions/BulkActions.tsx`
- `frontend/src/domains/workspace/Onboarding/Onboarding.tsx`
- `frontend/src/app/console/screens/MonitorsScreen/GroupManager.tsx`
- `frontend/src/app/console/screens/MonitorDetailScreen/monitorActions.ts`
- `frontend/src/app/console/screens/MonitorDetailScreen/MonitorDetailScreen.tsx`

## Tests
- `frontend/src/app/console/ConsoleApp.test.tsx`
- `frontend/src/app/console/consoleSource.test.ts`
- `frontend/src/domains/workspace/GroupList/GroupList.test.tsx`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.customization.test.tsx`
- `frontend/src/app/console/screens/MonitorsScreen/MonitorsScreen.test.tsx`
- `frontend/src/app/console/screens/MonitorsScreen/GroupManager.test.tsx`
- `frontend/src/domains/workspace/OrbitRail/OrbitRail.test.tsx`
- `frontend/src/domains/workspace/OrbitRail/railLayout.test.ts`
- `frontend/src/domains/workspace/BulkActions/BulkActions.test.tsx`
- `frontend/src/domains/workspace/Onboarding/Onboarding.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — monitor list with filter, view-only handling and demo fallback; en/pt-BR.
- 2026-10-22 — Reorder mode (FE-13) persisted through PUT /api/groups/order; console sections in the header.
- 2026-10-22 — card settings and Customize mode on the monitor list.
- 2026-10-22 — card actions open #/monitors/:id, acknowledge the open incident or open the target URL.
- 2026-10-22 — no backend: "Cannot reach the Orbit server" with Try again; demo only with `?demo`; guides ignore the built-in `orbit_self` monitor.
- 2026-10-22 — operator name prompt and "Change name" removed: the console opens straight to the workspace.
- 2026-10-24 — redesign: PageHeader with "…" menu, orbit rail instead of the 3D orb and intro boxes, one column grid for every group, clickable rows with chevron, two-line rows on mobile, StatusBadge, rule in plain words, bulk selection (pause/resume, move, delete), group management dialog, onboarding as the empty state; strings in the `ops` namespace.
- 2026-10-24 — monitor detail: Edit, Pause/Resume, Duplicate, Delete; history chart with axes, limit and readout; empty stats explained.
