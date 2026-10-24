---
id: FE-72
title: "Settings hub"
area: frontend
group: "Settings and customization"
status: done
screens: [settings, preferences, theme-editor, layout-editor]
spec: docs/07-customization.md
updated: 2026-10-24
---

# FE-72 · Settings hub

## Summary
One Settings area (`#/settings[/:section]`) with a sub-nav and six sections: General · Appearance · Notifications · Wall layouts · Connections · Advanced. Replaces the separate Device preferences, Customization, Appearance and Wall layouts screens and the header controls that duplicated them.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/app/console/screens/SettingsRoute/SettingsRoute.tsx` (page, `SettingsRouteProps { section, layoutId?, preferences, services }`)
- `frontend/src/app/settings/sections.ts` (section ids, `settingsHref`)
- `frontend/src/app/settings/SettingsNav/SettingsNav.tsx`
- `frontend/src/app/settings/GeneralSettings/GeneralSettings.tsx`, `ConfigImport.tsx`
- `frontend/src/app/settings/AdvancedSettings/AdvancedSettings.tsx`, `WallSoundCard.tsx`
- `frontend/src/app/settings/locales/{en,pt-BR}.json` (i18n namespace `settingsHub`)
- `frontend/src/app/console/AppearancePage/AppearancePage.tsx`
- `frontend/src/domains/settings/appearance/{AppearanceSettings,ThemeGallery,ThemeCard,DisplayControls}`
- `frontend/src/app/console/LayoutsPage/{LayoutsPage,CreateLayoutDialog,slug}.ts(x)`
- `frontend/src/domains/workspace/LayoutEditor/{LayoutEditor,BlockPreview}.tsx`, `domains/workspace/layout/blockNames.ts`
- `frontend/src/domains/workspace/{BlockSettings,LayoutSettings,DevicePreferences,MotionSettingsPanel}`
- `frontend/src/domains/customization/{CustomizationScreen,CustomizeLayer,CustomizeToggle,CustomizeInspector,SettingsEditor,TerminologyEditor,WallCustomization}`
- `frontend/src/domains/settings/variables/{variablesApi,VariablesCard,VariableDialog}` (`/api/variables`, `POST /api/workspace/reset`)
- `frontend/src/app/settings/AdvancedSettings/WorkspaceResetCard.tsx`

## Tests
- `frontend/src/app/console/screens/SettingsRoute/SettingsRoute.test.tsx`
- `frontend/src/app/settings/GeneralSettings/GeneralSettings.test.tsx`
- `frontend/src/app/console/LayoutsPage/LayoutsPage.test.tsx`
- `frontend/src/domains/settings/appearance/AppearanceSettings/AppearanceSettings.test.tsx`
- `frontend/src/domains/settings/appearance/ThemeGallery/ThemeGallery.test.tsx`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.test.tsx`, `domains/workspace/layout/blockNames.test.ts`
- `frontend/src/domains/workspace/DevicePreferences/DevicePreferences.test.tsx`, `MotionSettingsPanel.test.tsx`
- `frontend/src/domains/customization/CustomizeLayer/CustomizeLayer.test.tsx`, `SettingsEditor.test.tsx`, `TerminologyEditor.test.tsx`, `WallCustomization.test.tsx`
- `frontend/src/domains/settings/variables/{variablesApi,VariablesCard}.test.ts(x)`, `app/settings/AdvancedSettings/WorkspaceResetCard.test.tsx`, `domains/workspace/layout/layoutsApi.test.ts`
- `frontend/src/app/console/ConsoleApp.{preferences,theming,customization}.test.tsx` (reach Settings by hash)

## Decisions and notes
- Sub-nav: a vertical list of links (`aria-current="page"`) from 1024 px; below that a native select ("Section") — no extra component, keyboard and screen readers work by default. Hashes: `#/settings` (General), `#/settings/<section>`, `#/settings/wall-layouts/<id>`; the shell (FE-63) parses them and redirects the old routes.
- Each control lives in one place. General: device language, access as read-only status, workspace language default, config files with export and the styled `FilePicker` import (dry-run diff first). Appearance: theme, density, text size, animation. Advanced: Customize mode, viewing distance, device preferences file, wall sound, motion details, every registry setting (with JSON view), terminology and profiles.
- Appearance: one control per concept. Animation is a single segmented control (FE-06 preset); intensity, speed and the individual switches moved to Advanced › Motion details without a second preset button. Text size is a 4-step control over the FE-56 `typography.scale` setting (device scope).
- Theme choice is preview-then-apply: a card selects and previews on the real screen; the sticky footer has "Use on this device" (primary) and "Make workspace default" (theme + density + animation through BE-40). Leaving the page drops an unapplied preview. Hover preview was removed: it changed the whole screen while the pointer crossed the grid.
- Gallery shows 8 suggestions (Orbit Dark, GitHub Light, High contrast dark, Colorblind deuteranopia, Dracula, One Dark, Nord, Tokyo Night) plus the theme in use and your own themes; "Show all N themes" opens search and filters. Per-card actions (Duplicate & edit, Export, Edit, Delete) sit in a "…" Menu.
- Customize mode: the toggle moved to Advanced (switch) and `Ctrl+.` moved into `CustomizeLayer`, so it works wherever the layer is mounted. The bar publishes `--customize-bar-height` and pads `body` by the same amount, so it never covers content; the inspector stops above it. Outlines only on hover/focus (B1 CSS) plus the pressed gear handle.
- Scope wording: the registry editor says "Applies to: This device / Workspace / This layout" with a hint that matches storage (device values stay in this browser).
- Wall layouts: human block and template names with one-line descriptions (`settingsHub.blocks.*`, `settingsHub.templates.*`); creating asks for a name and a template in a dialog (address derived from the name, accents stripped); the template select starts on a disabled placeholder; each block draws a live sketch from the console's monitors (`BlockPreview`), so the console never loads wall components; saving moved to a sticky action bar enabled only after a change.
- Alternatives considered: tabs instead of a sub-nav (rejected: five sections with long content, deep links needed); a router library (rejected: hash routes already exist, no new dependency); reusing `ScreenPreview` for block previews (rejected: renders the full wall bundle inside the console, owned by another bucket).

- Notifications section mounts `domains/notifications/NotificationsSettings` (built by the notifications bucket) through a build-time `import.meta.glob`, so the section shows a placeholder until that screen exists.
- Wall layout menu: Copy TV address (clipboard, toast; no QR — no QR dependency in the project and the address is short), Duplicate (unsaved copy with its own address), Delete (confirm, `DELETE /api/layouts/{id}`; hidden when the client has no `remove`). Drafts stay local (changing the hash would remount the screen) until saved.
- Terminology: "Restore original names in <language>" confirms, then `DELETE /api/terminology/{locale}` (falls back to saving an empty map when the API has no reset).
- Variables (`/api/variables`): table with masked values through `SafeValue`, add/edit dialog (plain or secret; a secret is never read back, empty keeps it), delete with confirm; demo keeps them in memory.
- Restore workspace defaults: confirm, `POST /api/workspace/reset`, then reload workspace defaults, customization and terminology; monitors, layouts, connections and device choices are kept.
- Wall: a kiosk wall (`?kiosk=1`) never asks `/api/access` for Customize and never shows the toggle.

## Changelog
- 2026-10-24 — created: Settings area with sub-nav, General, Appearance (curated gallery, display controls, sticky footer), Wall layouts (names, create dialog, previews), Connections (mounts `ConnectionsSettings`), Advanced (Customize mode, device, sound, motion, registry, terminology, profiles).
- 2026-10-24 — Notifications section; layout copy address/duplicate/delete; terminology restore; variables CRUD; workspace reset; Customize hidden on kiosk walls; console integration tests moved to hash navigation.
