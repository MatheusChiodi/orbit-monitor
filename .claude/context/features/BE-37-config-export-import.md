---
id: BE-37
title: "Config export/import"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-37 · Config export/import

## Summary
Archive of all `orbit.<feature>.json` files (secrets omitted) with dry-run diff

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigArchive.java`
- `backend/orbit-config/src/main/java/io/orbit/config/AtomicFiles.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ConfigTransferController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/SelfMonitoringBeans.java`

## Tests
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigArchiveTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ConfigTransferApiTest.java`

## Decisions and notes
- Zip of `orbit.*.json` (no `.bak`/`.tmp`), `enc` secrets nulled on export and preserved on import; dry-run diff by item id; entries must match `orbit.<feature>.json`.
- `export()` zips `orbit.*.json` (sorted) with every `{"enc": ...}` replaced by null; `${env:NAME}` references are kept because they hold no secret. `diff()` compares items by id after restoring omitted secrets, so an unchanged re-import shows no changes. `apply()` writes each file with the same tmp + `.bak` + atomic rename as `ConfigFile` (`AtomicFiles`).
- Import safety: every entry must match `orbit.<feature>.json` (no directories, no traversal), at most 64 entries of 8 MB, each a `{version, items[]}` document with text ids; everything is parsed before anything is written. Schema/domain validation happens when the owner reloads (an invalid file keeps the last valid copy serving).
- API: `GET /api/config/export` (zip) and `POST /api/config/import?dryRun=true|false` (zip body, operator header, audited as `config.import`); settings and monitor files reload at once, other features on their next reload/restart.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — config export/import with dry-run diff, secret preservation and entry checks; API endpoints added (status: done).
