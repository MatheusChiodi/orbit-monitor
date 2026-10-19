---
id: FE-36
title: "Query history diff"
area: frontend
group: "Console productivity"
status: in-progress
screens: [audit-log]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-36 · Query history diff

## Summary
Side-by-side diff of SELECT changes from the audit trail

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[audit-log](../screens/audit-log.md)

## Code
- `frontend/src/domains/monitor/components/QueryDiff/QueryDiff.tsx`
- `frontend/src/domains/monitor/components/QueryDiff/diffLines.ts`

## Tests
- `frontend/src/domains/monitor/components/QueryDiff/QueryDiff.test.tsx`

## Decisions and notes
- Line diff by longest common subsequence (removals before additions, `<del>`/`<ins>`); both SELECT versions are redacted before diffing; authors are marked self-declared.
- Pending: feed from the audit API (BE-46).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — query history diff component (status: in-progress).
