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
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigFile.java`
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigMapper.java`
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigItem.java`
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigValidator.java`

## Tests
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigFileTest.java`

## Decisions and notes
- `ConfigFile<T>` handles one `orbit.<feature>.json`: `{"version":1,"items":[...]}`, ids required and unique, feature validator on read and write.
- Writes go to `.tmp` (fsync), the previous file is copied to `.bak`, then an atomic rename; owner-only permissions where POSIX is available.
- `reloadIfChanged()` detects external edits by modification time; an invalid file keeps the last valid copy serving and reports `lastError()` without overwriting it.
- Unknown fields are ignored (forward compatibility); other versions are rejected until migrations exist.
- Pending: JSON Schema files, example files with the secret/card scan test, encrypted secrets (vault), wiring of each feature file.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — generic config file store (validation, atomic write, .bak, reload).
