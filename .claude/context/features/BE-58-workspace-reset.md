---
id: BE-58
title: "Workspace reset"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-58 · Workspace reset

## Summary
Settings "Reset workspace": back to built-in defaults without touching monitors, groups or connections.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/WorkspaceResetController.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/WorkspaceResetApiTest.java`

## API
| Method | Path | Body / response |
|---|---|---|
| POST | `/api/workspace/reset` | no body → 200 `{ reset: ["defaults", "customization", "terminology"] }`; 403 non-editor; idempotent |

Audit `workspace.reset` (detail = the parts reset).

## Decisions and notes
- Resets the workspace defaults (BE-40: theme, animation, density, locale, scale back to built-ins), the `workspace` customization scope (BE-51) and the custom terminology of en and pt-BR.
- Keeps monitors, groups, connections, layouts, themes, customization profiles and layout/instance scopes, and the access policy (resetting it could lock the operator out).

## Changelog
- 2026-10-24 — reset endpoint (status: done).
