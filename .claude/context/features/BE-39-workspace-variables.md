---
id: BE-39
title: "Workspace variables"
area: backend
group: "Workspace and configuration"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-39 · Workspace variables

## Summary
`${var:name}` and `${vault:name}` references

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/variable/VariableResolver.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/variable/VariableResolverTest.java`

## Decisions and notes
- `${var:name}` from orbit.variables.json, `${vault:name}` decrypted only at use time; masked variant for previews/logs; unknown names fail.
- `VariableResolver`: single-pass regex substitution of `${var:name}` / `${vault:name}` (names `[A-Za-z_][A-Za-z0-9_.-]*`); a substituted value is never expanded again (no injection through variable values); `${env:...}` and other text untouched; unknown names fail naming the variable, never a value. `resolveMasked` shows `••••` for vault values and never decrypts. No dependency (plain `java.util.regex`; template engines such as StringSubstitutor were not needed).
- Still to do: `orbit.variables.json` store (schema already in orbit-config) and applying the resolver to request URLs/headers/bodies and SQL parameters in the runtime.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — VariableResolver implemented; VariableResolverTest un-pended (store and runtime wiring pending).
