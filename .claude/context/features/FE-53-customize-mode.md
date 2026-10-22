---
id: FE-53
title: "Customize mode and inspector"
area: frontend
group: "Customization"
status: done
screens: [wall, monitor-list, settings]
spec: docs/07-customization.md
updated: 2026-10-22
---

# FE-53 · Customize mode and inspector

## Summary
Ctrl+. toggles Customize mode; inspector with Content, Appearance, Behavior and Names tabs; apply to item, type, layout, device or workspace; live preview, undo, save/discard.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/shared/customization/changes.ts`
- `frontend/src/shared/customization/customizeMode.ts`
- `frontend/src/shared/customization/CustomizeHandle.tsx`
- `frontend/src/shared/customization/customization.css (outlines)`
- `frontend/src/domains/customization/CustomizeToggle/CustomizeToggle.tsx`
- `frontend/src/domains/customization/CustomizeLayer/CustomizeLayer.tsx`
- `frontend/src/domains/customization/CustomizeInspector/CustomizeInspector.tsx`
- `frontend/src/domains/customization/CustomizeInspector/nameKeys.ts`
- `frontend/src/domains/customization/CustomizeModeProvider/CustomizeModeProvider.tsx`
- `frontend/src/domains/customization/WallCustomization/WallCustomizeControls.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.tsx (handles)`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.tsx (handles)`

## Tests
- `frontend/src/shared/customization/customizeMode.test.ts`
- `frontend/src/domains/customization/CustomizeLayer/CustomizeLayer.test.tsx`
- `frontend/src/domains/customization/WallCustomization/WallCustomization.test.tsx`
- `frontend/src/app/console/ConsoleApp.customization.test.tsx`

## Decisions and notes
- `Ctrl+.` / `⌘.` or the header button toggles the mode; `html[data-customize=on]` outlines every `[data-customizable]` item and `CustomizeHandle` (⚙) appears next to it. The handle is tiny and lives in `shared/` so the wall can show it without editor code.
- Inspector: non-modal side panel (`role=dialog`) with Content · Appearance · Behavior · Names tabs, showing only settings whose `target` is the selected component type; Names reuses the FE-54 editor filtered to the labels that type shows.
- Apply scope: this item (instance), all items of this type (workspace value and per-item exceptions of that setting cleared), this layout (wall only), this device, workspace. Options a setting cannot use are disabled; a change falls back to the first allowed scope.
- Changes are kept as a list of pending changes in memory and previewed live through `resolve`; `Ctrl+Z` undoes (native undo kept inside text inputs), Discard and leaving the mode drop them, Save writes every touched scope (device to the browser, others through BE-51).
- Only clients with edit access get a mode store (`CustomizeModeProvider`); view-only clients never see the toggle. On the wall the controls load lazily after `/api/access` returns edit.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-22 — Customize mode with handles, inspector tabs, apply-scope chooser, live preview, undo, save and discard in the console and on the wall (status: done).
