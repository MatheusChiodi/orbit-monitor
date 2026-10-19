---
id: BE-39
title: "Workspace variables"
area: backend
group: "Workspace and configuration"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-39 · Workspace variables

## Summary
`${var:name}` and `${vault:name}` references

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/variable/VariableResolver.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/variable/VariableResolverTest.java`

## Decisions and notes
- `${var:name}` from orbit.variables.json, `${vault:name}` decrypted only at use time; masked variant for previews/logs; unknown names fail.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
