---
screen: admin-connections
title: "Database connections"
route: "index.html#/settings/connections"
status: done
spec: docs/02-features.md §6, BE-48
updated: 2026-10-24
---

# Database connections

## Purpose
Connection registry (edit access required), test connection, secret rotation; saved to orbit.connections.json.

## Layout and components
Settings › Connections (`#/settings/connections`, the Settings shell mounts it) → `ConnectionsSettings` (default export of `domains/connections/ConnectionsSettings`): a `Card` with the title, a one-line description and "Add connection"; `EmptyState` ("No connections yet" + Add connection) on a fresh install; otherwise a `Table` (name, database, address, user, last test) with a row `Menu`: Test connection, Edit, Change password, Delete (confirm `Dialog`). `ConnectionDialog` adds/edits (name, database, JDBC URL with an example per database, read-only user, password via `SecretInput` or an environment variable). The same dialog opens from the SQL monitor's connection select.

## States
- Loading (nothing until the list arrives), empty (EmptyState), load error (alert text), view-only access (no actions, explanation line)
- Test: not tested / testing… / connected in N ms / couldn't connect + server reason
- i18n: en / pt-BR (`monitorForm.connections.*`)
- Animation level: no decorative motion; dialogs and toasts use the primitives' motion
- Privacy: the password is write-only and never rendered; the API only returns `•••• (vault)`

## Features on this screen
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — done
- [FE-65 · Connections UI](../features/FE-65-connections-ui.md) — done

## Code
- `frontend/src/domains/connections/ConnectionsSettings/ConnectionsSettings.tsx`
- `frontend/src/domains/connections/ConnectionDialog/ConnectionDialog.tsx`
- `frontend/src/domains/connections/ConnectionTestStatus/ConnectionTestStatus.tsx`
- `frontend/src/domains/connections/model/connectionModel.ts`

## Tests
- `frontend/src/domains/connections/ConnectionsSettings/ConnectionsSettings.test.tsx`
- `frontend/src/domains/connections/ConnectionDialog/ConnectionDialog.test.tsx`
- `frontend/src/domains/connections/model/connectionModel.test.ts`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-24 — built as Settings › Connections (FE-65): list, add, edit, test, change password, delete.
