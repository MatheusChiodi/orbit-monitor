---
screen: audit-log
title: "Audit log"
route: "index.html#/admin/audit"
status: done
spec: FE-36, BE-46
updated: 2026-10-24
---

# Audit log

## Purpose
Filterable trail with SELECT diff.

## Layout and components
`AuditScreen` at `#/audit` (alias `#/admin/audit`): filter form (action, target, client select: any / This machine / Local network / Unknown → `operator=`), table of 50 entries per page, and a SELECT history panel (`QueryDiff`) for `sql.save` targets.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-08 · Access policy, vault and audit](../features/CORE-08-access-policy-vault-and-audit.md) — in-progress
- [FE-36 · Query history diff](../features/FE-36-query-history-diff.md) — done

## Code
- `frontend/src/app/console/screens/AuditScreen/AuditScreen.tsx`
- `frontend/src/app/console/screens/AuditScreen/queryChanges.ts`
- `frontend/src/shared/ui/ActorLabel/ActorLabel.tsx`
- `frontend/src/app/console/screens/AuditScreen/auditLabels.ts`

## Tests
- `frontend/src/app/console/screens/AuditScreen/queryChanges.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`
- `frontend/src/app/console/screens/AuditScreen/auditLabels.test.ts`

## Decisions and notes
- Redesign (FE-36): filters are three selects applied on change (Action area sent as prefix, Monitor, Client); actions show human labels (`ops.audit.actions.*`, raw key on hover, unknown keys fall back to the raw key); targets show the monitor name; "View change" button opens the query diff panel with a Close action; the `Table` primitive stacks rows under 640 px so there is no horizontal scroll at 390 px; pagination shows "from–to of total".

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — audit trail screen with filters, pagination and SELECT history diff (status: done).
- 2026-10-22 — operator name retired: the "Operator" column and filter became "Client" (client kind via `ActorLabel`, legacy names through `SafeValue`).
- 2026-10-24 — redesign: select filters, human action labels, View change, responsive table.
- 2026-10-24 — console route test follows the select filters (applied on change) and the "View change: <monitor>" button.
