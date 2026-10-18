---
screen: monitor-editor-sql
title: "SQL monitor editor"
route: "index.html#/monitors/new/sql"
status: planned
spec: docs/02-features.md §2.2
updated: 2026-10-18
---

# SQL monitor editor

## Purpose
Connection, SQL editor with guards, preview with detected types, read mode suggestion, conditions.

## Layout and components
_To be filled as the screen is built (component tree, file paths)._

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-01 · Gatus-style conditions](../features/CORE-01-gatus-style-conditions.md) — in-progress
- [CORE-02 · SQL validator and row-limit wrapper](../features/CORE-02-sql-validator-and-row-limit-wrapper.md) — planned
- [CORE-03 · SQL probe and result payload](../features/CORE-03-sql-probe-and-result-payload.md) — planned
- [CORE-16 · Sensitive data protection (LGPD / PCI DSS)](../features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) — planned
- [FE-33 · SQL editor](../features/FE-33-sql-editor.md) — planned
- [FE-34 · Condition builder](../features/FE-34-condition-builder.md) — planned

## Code
_None yet._

## Tests
_None yet._

## Changelog
- 2026-10-18 — context file created.
