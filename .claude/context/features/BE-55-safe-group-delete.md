---
id: BE-55
title: "Safe group delete"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-55 · Safe group delete

## Summary
A group is never deleted with monitors in it: 409 with the members, or move them first with `moveTo`.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/GroupController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ConflictException.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ProblemHandler.java`
- `backend/orbit-api/src/main/resources/messages.properties`
- `backend/orbit-api/src/main/resources/messages_pt_BR.properties`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/MonitorActionsApiTest.java` (`groupDelete`, `emptyGroupDelete`)

## API
| Method | Path | Body / response |
|---|---|---|
| DELETE | `/api/groups/{id}` | empty group → 204; with monitors → 409 Problem `{ code: "group-not-empty", members: [{ id, name }] }`; 404 unknown |
| DELETE | `/api/groups/{id}?moveTo=<groupId>` | moves every member to `moveTo`, then deletes → 204; 400 when `moveTo` is the same or an unknown group |

Audit `group.delete` detail: `<n> monitors moved to <groupId>` when members moved.

## Decisions and notes
- 409 Conflict (RFC 9110 §15.5.10) with the dependants as Problem Details extension members (RFC 9457 §3.2), so the console can open its "move to" dialog straight from the error.
- `ConflictException` carries a stable `code`, a translated detail (`problem.<code>.detail`, en + pt-BR) and the extra properties.

## Changelog
- 2026-10-24 — 409 with members; `moveTo` moves them first (status: done).
