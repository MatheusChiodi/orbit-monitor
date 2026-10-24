---
id: FE-63
title: "Console shell: sidebar, top bar, drawer, command palette and routes"
area: frontend
group: "Console shell"
status: done
screens: [console]
spec: docs/03-design.md
updated: 2026-10-24
---

# FE-63 · Console shell and navigation

## Summary
The console's frame for the redesign: a 232 px left sidebar (≥ 1024 px) with Monitors · Incidents (open count) · Maintenance · Reports, a "More" group (Status pages, Dependencies, Audit), Settings and "Open wall ↗" at the bottom; a slim top bar with the section name (mobile), "Search or jump… Ctrl K" and the notification bell; an accessible drawer on mobile; a demo banner with "Exit demo"; one toast viewport. Device preferences, Customization, Appearance, Wall layouts, the Customize toggle and the language selector left the header for Settings (FE-72). Routes gained `#/monitors/:id/edit`, `#/settings/:section` and legacy redirects.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/app/console/ConsoleShell/ConsoleShell.tsx` (layout, skip link, palette / shortcut / toast mounting)
- `frontend/src/app/console/ConsoleNav/` (`ConsoleNav.tsx`, `navSections.ts`, `navIcons.tsx`)
- `frontend/src/app/console/ConsoleHeader/ConsoleHeader.tsx` (top bar)
- `frontend/src/app/console/NavDrawer/NavDrawer.tsx`
- `frontend/src/app/console/DemoBanner/DemoBanner.tsx`
- `frontend/src/app/console/CommandPalette/` (on the `Dialog` primitive; kinds monitor, incident, group, page, layout, action)
- `frontend/src/app/console/ConsolePalette/ConsolePalette.tsx`
- `frontend/src/app/console/ShortcutsHelp/ShortcutsHelp.tsx` (on `Dialog`)
- `frontend/src/app/console/routes/routes.ts` (`SETTINGS_SECTIONS`, `edit-monitor`, `redirectFor`, `RouteTarget`)
- `frontend/src/app/console/ConsoleRoutes/ConsoleRoutes.tsx` (`SettingsRouteProps`, lazy `EditMonitorScreen`, not-found)
- `frontend/src/app/console/screens/ScreenStatus/ScreenStatus.tsx` (skeleton, error with retry, `ScreenTitle` = `PageHeader`)
- `frontend/src/app/console/ServerUnreachable/ServerUnreachable.tsx`
- `frontend/src/app/console/demoServices.ts`, `ConsoleApp.tsx` (`?demo` never reaches the server)
- `frontend/src/domains/alerting/NotificationCenter/NotificationCenter.tsx` (bell icon + count, popover), `app/console/NotificationsBell/NotificationsBell.tsx` (toasts through `useToast`)
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.tsx`

## Tests
- `frontend/src/app/console/ConsoleApp.shell.test.tsx` (sidebar, count, settings sections, redirects, not-found, palette search and jumps, drawer, Customize from the palette, demo without API, one toast viewport)
- `frontend/src/app/console/routes/routes.test.ts`
- `frontend/src/app/console/CommandPalette/CommandPalette.test.tsx`, `ShortcutsHelp/ShortcutsHelp.test.tsx`
- `frontend/src/domains/alerting/NotificationCenter/NotificationCenter.test.tsx`
- `frontend/src/app/console/ConsoleApp.test.tsx`, `ConsoleApp.routes.test.tsx` (updated)

## Decisions and notes
- Routing stays a hash parser (`useSyncExternalStore` on `hashchange`), no router dependency. Alternatives: wouter (~2 KB, MIT) and TanStack Router (typed, much larger); neither adds what 15 flat routes need. Legacy hashes are replaced with `history.replaceState` (no extra history entry); `routeHref` still accepts the old route names so callers keep compiling.
- `#/monitors/:id/edit` loads `screens/EditMonitorScreen/EditMonitorScreen.tsx` through `import.meta.glob` + `lazy`, so the shell builds before that screen exists; view-only clients get the detail screen.
- Settings contract: `SettingsRoute({ section, layoutId?, preferences, services })`. The section list, `isSettingsSection` and `settingsHref` come from `app/settings/sections.ts` (FE-72 owns them); `#/settings` is `general`. The palette names sections with `settingsHub.nav.*`.
- Command palette: kept the in-house list (combobox + listbox, accent/case-insensitive ranking) on the `Dialog` primitive instead of cmdk (MIT, ~8 KB + Radix dialog) — same keyboard model, no new dependency. Searches monitors, open incidents (by monitor name), groups, every page and Settings section, and actions (Add monitor, Open wall, Keyboard shortcuts, Customize mode). Controlled from the top bar; `Ctrl/⌘ K` stays inside.
- Mobile drawer: a portal panel with `role="dialog"`, focus moved to the current link, Tab trapped (`shared/ui/popover/focus`), Esc/backdrop close, focus back to the menu button, closes after navigation. The `Dialog` primitive is centred, so the drawer is local; a `Sheet` primitive in `shared/ui` would replace it.
- Palette actions (product priority: every function one search away): Add monitor, New group, New maintenance window, New status page, Add connection, Add notification channel, Export configuration, Open wall, Keyboard shortcuts, Customize mode; per monitor Edit, Pause or resume, Run now, Delete…; per open incident Acknowledge and Resolve. Per-item commands appear only after typing. Actions owned by a screen travel as a one-shot hash query (`#/maintenance?action=new-window`); the owning screen calls `useRouteAction(action, run)` from `app/console/routes`, which runs once and drops the query. Delete only opens the detail screen's confirmation. Acknowledge, Resolve and Export run in the palette (toast on success or failure). Alternative considered: a command registry in context that screens register into; rejected because actions must also work when the target screen is not mounted yet.
- `parseRoute` ignores the hash query (`#/monitors/new?from=<id>` for Duplicate).
- Editors always see a primary "Add monitor" at the top of the sidebar and drawer.
- Customize mode has no header button: `Ctrl+.` lives in CustomizeLayer (FE-53) and the palette offers "Toggle Customize mode" to editors.
- Demo (`?demo`): no `/api/access`, no wall socket, no customization/terminology/themes/layouts/defaults requests (in-memory `createDemoServices`). Verified in the browser: zero `/api/*` requests and no `/ws/wall`.
- Toasts: one `<ToastViewport />` in the shell; new incidents from the feed become toasts (DOWN announced as alert). The old `Toaster` was removed.
- Skeleton is static (no looping animation in the console); errors show what happened and "Try again" when a retry makes sense.

## Changelog
- 2026-10-24 — new console shell, routes for edit and settings sections, legacy redirects, palette and shortcuts on Dialog, demo without API (status: done).
- 2026-10-24 — settings sections read from the Settings area; "Add monitor" wording in the palette and shortcut sheet.
- 2026-10-24 — palette actions (create, per-monitor and per-incident commands, export) through `?action=` and `useRouteAction`; sidebar Add monitor; hash query ignored by the router.
