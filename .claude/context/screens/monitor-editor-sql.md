---
screen: monitor-editor-sql
title: "SQL monitor editor"
route: "index.html#/monitors/new/sql"
status: in-progress
spec: docs/02-features.md §2.2
updated: 2026-10-22
---

# SQL monitor editor

## Purpose
Connection, SQL editor with guards, preview with detected types, read mode suggestion, conditions.

## Layout and components
`NewMonitorScreen` (`#/monitors/new`, `#/monitors/new/sql`) → `MonitorForm`: kind picker, `TargetFields` (connection + `SqlCodeEditor` with the connection catalog via `useCatalog`), preview (`PreviewTable`), Data & display (`DataDisplayStep`), conditions (`ConditionBuilder`).

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-01 · Gatus-style conditions](../features/CORE-01-gatus-style-conditions.md) — done
- [CORE-02 · SQL validator and row-limit wrapper](../features/CORE-02-sql-validator-and-row-limit-wrapper.md) — done
- [CORE-03 · SQL probe and result payload](../features/CORE-03-sql-probe-and-result-payload.md) — in-progress
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — done
- [CORE-16 · Sensitive data protection (LGPD / PCI DSS)](../features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) — done
- [FE-33 · SQL editor](../features/FE-33-sql-editor.md) — done
- [FE-34 · Condition builder](../features/FE-34-condition-builder.md) — done

## Code
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.tsx`
- `frontend/src/domains/monitor/sql/sql.ts`
- `frontend/src/domains/monitor/form/form.ts`
- `frontend/src/domains/monitor/conditions/conditions.ts`
- `frontend/src/app/console/screens/NewMonitorScreen/NewMonitorScreen.tsx`
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.tsx`

## Tests
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.test.tsx`
- `frontend/src/domains/monitor/sql/sql.test.ts`
- `frontend/src/domains/monitor/form/form.test.ts`
- `frontend/src/domains/monitor/conditions/conditions.test.ts`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.kinds.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.kinds.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — SQL editor screen with client-side safe mode, preview, data step and conditions; en/pt-BR.
- 2026-10-22 — SQL editor with catalog, condition builder and kind picker in the form.
