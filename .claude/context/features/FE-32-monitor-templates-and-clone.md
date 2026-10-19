---
id: FE-32
title: "Monitor templates and clone"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-32 · Monitor templates and clone

## Summary
"Spring Actuator health", "Oracle blocking locks", etc.; clone wizard

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/domains/monitor/templates/templates.ts`
- `frontend/src/domains/monitor/components/TemplatePicker/TemplatePicker.tsx`

## Tests
- `frontend/src/domains/monitor/components/TemplatePicker/TemplatePicker.test.tsx`

## Decisions and notes
- Templates (Spring Actuator health, Oracle blocking locks) carry no secrets or connection ids; `cloneDefinition` drops the id, names it "Copy of …" and drops vault-backed headers so they are typed again.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — monitor templates and clone (status: done).
