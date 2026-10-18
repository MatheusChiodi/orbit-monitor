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
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/privacy/PayloadRedactor.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckRunner.java`
- `frontend/src/shared/privacy/redact.ts`

## Tests
- `backend/orbit-common/src/test/java/io/orbit/common/privacy/SensitiveDataRedactorTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/privacy/PayloadRedactorTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/CheckRunnerTest.java`
- `frontend/src/shared/privacy/redact.test.ts`
- `frontend/src/app/console/ConsoleApp.privacy.pending.test.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.privacy.pending.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.privacy.pending.test.tsx`
- `frontend/src/domains/monitor/display/display.privacy.pending.test.ts`
- `frontend/src/domains/wall/components/AlsoActive/AlsoActive.privacy.pending.test.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.privacy.pending.test.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.privacy.pending.test.tsx`
- `frontend/src/domains/wall/components/NearLimit/NearLimit.privacy.pending.test.tsx`
- `frontend/src/domains/wall/components/Timeline/Timeline.privacy.pending.test.tsx`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.privacy.pending.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.privacy.pending.test.tsx`
- `frontend/src/shared/privacy/SafeValue/SafeValue.pending.test.tsx`
- `frontend/src/shared/ui/SecretInput/SecretInput.pending.test.tsx`

## Decisions and notes
- Backend: `SensitiveDataRedactor` classifies by field-name tokens (camelCase, snake_case and adjacent pairs such as `api_key`) and by value: Luhn PAN (13-19 digits, also as numeric values), CPF/CNPJ check digits, e-mail, formatted BR phone, JWT and Bearer tokens.
- Backend: Masks: PAN `•••• •••• •••• 1234`, SAD `[REDACTED]`, secrets `••••`, CPF `•••.•••.•••-12`, e-mail `j•••@d•••.com`, phone `(••) •••••-1234`, other personal fields first letter + `•••`.
- Backend: Probe boundary: `CheckRunner` evaluates conditions on the raw result in memory, then returns a `CheckResult` with masked payload (SQL rows, JSON body by key/value, sensitive headers), masked condition values/messages and masked error text.
- Backend: Next: Jackson serialization guard and Logback masking converter.
- Frontend: `detectSensitive` / `redact` mirror the backend redactor: Luhn PAN 13-19 digits (spaces/hyphens, numbers, inside free text and JSON) → `•••• •••• •••• 1234`; CVV/CVC/track/PIN by field name → `[REDACTED]`; CPF/CNPJ with valid check digits → `•••.•••.•••-12` / `••.•••.•••/••••-81`; e-mail → `j•••@d•••.com`; JWT, Bearer and secret field names → `••••`.
- Frontend: Classification by field name or by value; non-sensitive values keep their type; redaction is idempotent.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: redaction core (detectors and masks) in orbit-common.
- 2026-10-18 — backend: probe-boundary redaction (PayloadRedactor + CheckRunner).
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: Luhn-based PAN redaction and detectors in `src/shared/privacy`.
