---
id: CORE-16
title: "Sensitive data protection (LGPD / PCI DSS)"
area: full-stack
group: "Privacy"
status: planned
screens: [wall, monitor-editor-sql, monitor-editor-http, data-and-display]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-16 · Sensitive data protection (LGPD / PCI DSS)

## Summary
Detect and redact PAN (Luhn), SAD, CPF/CNPJ, e-mail, phone, secrets at the probe boundary, serialization, logs and `<SafeValue>`. A full PAN is never displayed. See docs/04-data-protection.md.

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [monitor-editor-sql](../screens/monitor-editor-sql.md), [monitor-editor-http](../screens/monitor-editor-http.md), [data-and-display](../screens/data-and-display.md)

## Code
_None yet._

## Tests
_None yet._

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
