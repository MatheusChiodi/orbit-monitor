---
id: CORE-19
title: "Per-feature JSON configuration files"
area: backend
group: "Platform"
status: in-progress
screens: [settings, monitor-editor-http, monitor-editor-sql, admin-connections, layout-editor, theme-editor]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-19 · Per-feature JSON configuration files

## Summary
One orbit.<feature>.json per feature in ~/.orbit/config, schema-validated, atomic writes, .bak, reload on change, encrypted secrets; never committed. See docs/06-configuration-files.md.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[settings](../screens/settings.md), [monitor-editor-http](../screens/monitor-editor-http.md), [monitor-editor-sql](../screens/monitor-editor-sql.md), [admin-connections](../screens/admin-connections.md), [layout-editor](../screens/layout-editor.md), [theme-editor](../screens/theme-editor.md)

## Code
- `frontend/src/shared/api/configResources.ts`
- `frontend/src/app/settings/configTransfer.ts`
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigFile.java`
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigSchemas.java`
- `backend/config-examples/orbit.groups.example.json`

## Tests
- `frontend/src/shared/api/configResources.test.ts`
- `frontend/src/app/settings/configTransfer.pending.test.ts`
- `frontend/src/app/settings/configTransfer.test.ts`
- `frontend/src/app/settings/SettingsScreen/SettingsScreen.pending.test.tsx`
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigFileTest.java`
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigExamplesTest.java`
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigSchemasTest.java`

## Decisions and notes
- `ConfigFile<T>` handles one `orbit.<feature>.json`: `{"version":1,"items":[...]}`, ids required and unique, feature validator on read and write.
- Writes go to `.tmp` (fsync), the previous file is copied to `.bak`, then an atomic rename; owner-only permissions where POSIX is available.
- `reloadIfChanged()` detects external edits by modification time; an invalid file keeps the last valid copy serving and reports `lastError()` without overwriting it.
- Unknown fields are ignored (forward compatibility); other versions are rejected until migrations exist.
- Pending: JSON Schema files, example files with the secret/card scan test, encrypted secrets (vault), wiring of each feature file.
- Frontend: One typed client for every per-feature resource (`/api/<resource>` ↔ `orbit.<resource>.json`), payload `{ version, items }`; a 404 (file not created yet) is an empty list.
- Frontend: Encrypted secrets (`{ enc }`) are replaced by `{ vault: true }` before reaching components; nothing is stored in the browser.
- Frontend: Frontend: export strips encrypted values, `${env:…}` references and vault markers; import shows a dry-run diff (added / changed / removed ids per file) before applying.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — generic config file store (validation, atomic write, .bak, reload).
- 2026-10-18 — example files folder with a test that fails on secrets, card numbers or CPFs.
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: typed config resource client.
- 2026-10-18 — frontend: frontend: config export/import helpers.
- 2026-10-18 — pending tests for JSON Schema per file.
