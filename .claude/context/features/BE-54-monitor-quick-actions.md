---
id: BE-54
title: "Monitor quick actions: pause, resume, duplicate, push token"
area: backend
group: "Monitors"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-54 · Monitor quick actions: pause, resume, duplicate, push token

## Summary
Act on a saved monitor without resending its definition (the client only has masked secrets).

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/MonitorEdits.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/MonitorDefinitions.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorActionsController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallViews.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallViewFactory.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/MonitorEditsTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/MonitorActionsApiTest.java`

## API
| Method | Path | Body / response |
|---|---|---|
| POST | `/api/monitors/{id}/pause` | → 200 `MonitorDetail` (`definition.paused: true`); 404 unknown; 403 non-editor |
| POST | `/api/monitors/{id}/resume` | → 200 `MonitorDetail` (`definition.paused: false`) |
| POST | `/api/monitors/{id}/duplicate` | → 201 `MonitorDetail` of the copy: new id (`<prefix>_<name>_copy_xxxxxx`), name `<name> (copy)`, `paused: false`, sealed secrets copied server side; a push copy gets its own token and `pushUrl` |
| POST | `/api/monitors/{id}/push-token` | → 200 `{ monitorId, pushUrl }`; the old URL stops working at once; 400 when not a push monitor; 404 unknown |

`GET /api/monitors` and the wall snapshot list `paused: boolean` on every `MonitorView` (always false for `orbit_self`).

Audit actions: `monitor.pause`, `monitor.resume`, `monitor.duplicate` (detail `from <id>`), `monitor.push-token` (no detail, never the token).

## Decisions and notes
- `MonitorEdits` rebuilds a definition of any kind changing one field and keeps window, retry, HTTP steps, OAuth and probe settings. `moveToGroup` now uses it (it used to drop window, retry, steps, OAuth and probe settings).
- Copies reuse the sealed `SecretRef`s (ciphertext or env reference), so no secret is decrypted or sent to the client. A push copy never shares the original token: two monitors on one URL would make the signal ambiguous.
- Token rotation registers the new token first, then saves; on a failed save `syncSchedule` restores the stored token.
- Dedicated action endpoints instead of PATCH: each action has its own audit entry and access rule, and the client never sends a partial definition (RFC 9110 POST for non-idempotent actions).

## Changelog
- 2026-10-24 — pause/resume, duplicate and push token rotation endpoints (status: done).
- 2026-10-24 — `paused` added to WallViews.MonitorView (monitor list and wall snapshot).
