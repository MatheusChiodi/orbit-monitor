---
id: FE-67
title: "Monitor edit"
area: frontend
group: "Console redesign"
status: done
screens: [monitor-editor-http, monitor-editor-sql]
spec: docs/02-features.md §2
updated: 2026-10-24
---

# FE-67 · Monitor edit

## Summary
`#/monitors/:id/edit` opens a saved monitor in the guided form; "Save changes" posts it back with its id and returns to the monitor page.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md), [monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `frontend/src/app/console/screens/EditMonitorScreen/EditMonitorScreen.tsx` (default export `({ id })`)
- `frontend/src/domains/monitor/form/fromDefinition.ts` (`stateFromDefinition`, `duplicateOf`, `stateFromTemplate`)
- `frontend/src/app/console/screens/NewMonitorScreen/withKept.ts`

- `frontend/src/domains/monitor/components/PushUrlPanel/PushUrlPanel.tsx`

## Tests
- `frontend/src/domains/monitor/form/fromDefinition.test.ts`
- `frontend/src/app/console/screens/EditMonitorScreen/EditMonitorScreen.test.tsx`

## Decisions and notes
- Saving is `POST /api/monitors` with the existing `id` (the server upserts); no new endpoint.
- `GET /api/monitors/{id}` returns the stored shape (`timeoutMs`, `downAfter`, fields with `key`/`series`, conditions as `{expression, level}`); `stateFromDefinition` maps it back to the form. Settings the form does not edit (`paused`, `hysteresis`, `openOnWarn`, `window`, `retry`, `parameters`, `maxRows`, `followRedirects`) are sent back unchanged so an edit never un-pauses a monitor.
- Secrets stay masked: secret headers come back as `•••• (vault)` and are sent back as is (the server keeps the stored value); an empty OAuth client secret keeps the stored one.
- Saved rules the visual editor cannot show (e.g. `contains`, `matches`) are listed as "kept as written" and saved back verbatim as `{expression, level}`.
- Edit shows "Delete monitor" (danger, confirmation) in the action bar and "Move to group" is the group select of the Target step.
- Push monitors: the URL is shown once with Copy after creation; in edit "Generate a new URL" (`POST /api/monitors/{id}/push-token`) after a confirmation.

## Changelog
- 2026-10-24 — edit screen and duplicate support (status: done).
- 2026-10-24 — delete from edit, push URL copy and regenerate.
