---
id: FE-55
title: "Card and component behavior settings"
area: frontend
group: "Customization"
status: done
screens: [wall, monitor-list]
spec: docs/07-customization.md
updated: 2026-10-22
---

# FE-55 · Card and component behavior settings

## Summary
Per type and per instance: fields, order, size, variant, sparkline, format, color bands, icon, titles, click/double-click/hover/expand actions, badges, empty-state text.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/shared/customization/definitions/cards.ts`
- `frontend/src/shared/customization/cards.ts`
- `frontend/src/shared/customization/CardIcon.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.tsx`
- `frontend/src/app/console/screens/MonitorsScreen/MonitorsScreen.tsx`
- `frontend/src/app/console/screens/MonitorDetailScreen/MonitorDetailScreen.tsx`

## Tests
- `frontend/src/shared/customization/cards.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.customization.test.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.customization.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.actions.test.tsx`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`

## Decisions and notes
- Monitor card settings (type, layout, device, instance scopes): variant (compact / regular / detailed), ordered fields (state and name always kept), title / subtitle / unit (instance only), value format (auto / integer / decimal / compact), icon, tint by state, click / double-click / long-press action, hover (highlight / tooltip / none), expand (inline / none). Group settings: summary, title (instance), empty-state text, order (exceptions first / name / severity / manual).
- Actions are resolved by `useCardInteractions`: the host supplies handlers for the actions it supports (`open-detail`, `acknowledge`, `open-target`); `expand` is handled in place. A card with no supported action stays a plain element (no role, no tab stop); otherwise it is a keyboard-operable button (Enter / Space) and long press fires after 500 ms.
- Titles, subtitles and values go through `<SafeValue>` / `safeText`, and a value that looks like a card number stays masked whatever the format (docs/04).
- Wired into the console monitor list (`GroupList`) and the wall matrix (`MonitorMatrix`, now with a text state label next to the dot for WARN/DOWN). Hosts that do not pass `onOpenMonitor` / `onMonitorAction` yet (console list, `WallScreen`) leave those actions inert; a monitor detail view does not exist yet.
- Badges were dropped from the registry because no card renders per-card badges yet; add them back with the component that shows them.
- Console wiring (orbit-frontend): `open-detail` opens `#/monitors/:id`, `acknowledge` acknowledges the monitor's open incident through `/api/incidents/{id}/ack` (or says there is none), `open-target` opens the monitored http(s) URL in a new tab (`noopener`), otherwise the detail.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-22 — card and group settings from the registry wired into GroupList and MonitorMatrix (status: done).
- 2026-10-22 — card actions open-detail, acknowledge and open-target wired in the console.
