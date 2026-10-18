---
id: CORE-16
title: "Sensitive data protection (LGPD / PCI DSS)"
area: full-stack
group: "Privacy"
status: in-progress
screens: [wall, monitor-editor-sql, monitor-editor-http, data-and-display]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-16 · Sensitive data protection (LGPD / PCI DSS)

## Summary
Detect and redact PAN (Luhn), SAD, CPF/CNPJ, e-mail, phone, secrets at the probe boundary, serialization, logs and `<SafeValue>`. A full PAN is never displayed. See docs/04-data-protection.md.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [monitor-editor-sql](../screens/monitor-editor-sql.md), [monitor-editor-http](../screens/monitor-editor-http.md), [data-and-display](../screens/data-and-display.md)

## Code
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/SensitiveDataRedactor.java`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/Luhn.java`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/BrazilianDocuments.java`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/DataClass.java`

## Tests
- `backend/orbit-common/src/test/java/io/orbit/common/privacy/SensitiveDataRedactorTest.java`

## Decisions and notes
- Backend: `SensitiveDataRedactor` classifies by field-name tokens (camelCase, snake_case and adjacent pairs such as `api_key`) and by value: Luhn PAN (13-19 digits, also as numeric values), CPF/CNPJ check digits, e-mail, formatted BR phone, JWT and Bearer tokens.
- Backend: Masks: PAN `•••• •••• •••• 1234`, SAD `[REDACTED]`, secrets `••••`, CPF `•••.•••.•••-12`, e-mail `j•••@d•••.com`, phone `(••) •••••-1234`, other personal fields first letter + `•••`.
- Backend: Next: payload redaction at the probe boundary, Jackson serialization guard and Logback masking converter.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: redaction core (detectors and masks) in orbit-common.
