---
id: CORE-19
title: "Per-feature JSON configuration files"
area: backend
group: "Platform"
status: planned
screens: [settings, monitor-editor-http, monitor-editor-sql, admin-connections, layout-editor, theme-editor]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-19 · Per-feature JSON configuration files

## Summary
One orbit.<feature>.json per feature in ~/.orbit/config, schema-validated, atomic writes, .bak, reload on change, encrypted secrets; never committed. See docs/06-configuration-files.md.

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[settings](../screens/settings.md), [monitor-editor-http](../screens/monitor-editor-http.md), [monitor-editor-sql](../screens/monitor-editor-sql.md), [admin-connections](../screens/admin-connections.md), [layout-editor](../screens/layout-editor.md), [theme-editor](../screens/theme-editor.md)

## Code
_None yet._

## Tests
_None yet._

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
