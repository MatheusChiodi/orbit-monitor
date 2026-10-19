---
id: BE-37
title: "Config export/import"
area: backend
group: "Workspace and configuration"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-37 · Config export/import

## Summary
Archive of all `orbit.<feature>.json` files (secrets omitted) with dry-run diff

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigArchive.java`

## Tests
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigArchiveTest.java`

## Decisions and notes
- Zip of `orbit.*.json` (no `.bak`/`.tmp`), `enc` secrets nulled on export and preserved on import; dry-run diff by item id; entries must match `orbit.<feature>.json`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
