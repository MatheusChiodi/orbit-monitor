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
- `frontend/src/shared/privacy/SafeValue/SafeValue.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.tsx`
- `frontend/src/domains/wall/components/Timeline/Timeline.tsx`
- `frontend/src/domains/wall/components/AlsoActive/AlsoActive.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.tsx`
- `frontend/src/domains/wall/components/NearLimit/NearLimit.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.tsx`
- `frontend/src/domains/monitor/rules/rules.ts`
- `frontend/src/shared/ui/ThresholdChart/ThresholdChart.tsx`

## Tests
- `backend/orbit-common/src/test/java/io/orbit/common/privacy/SensitiveDataRedactorTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/privacy/PayloadRedactorTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/CheckRunnerTest.java`
- `frontend/src/shared/privacy/redact.test.ts`
- `frontend/src/shared/privacy/SafeValue/SafeValue.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.privacy.test.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.privacy.test.tsx`
- `frontend/src/domains/wall/components/Timeline/Timeline.privacy.test.tsx`
- `frontend/src/domains/wall/components/AlsoActive/AlsoActive.privacy.test.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.privacy.test.tsx`
- `frontend/src/domains/wall/components/NearLimit/NearLimit.privacy.test.tsx`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.privacy.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.privacy.test.tsx`
- `frontend/src/app/console/ConsoleApp.privacy.test.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.privacy.pending.test.tsx`
- `frontend/src/domains/monitor/display/display.privacy.pending.test.ts`
- `frontend/src/shared/ui/SecretInput/SecretInput.pending.test.tsx`

## Decisions and notes
- Backend: `SensitiveDataRedactor` classifies by field-name tokens (camelCase, snake_case and adjacent pairs such as `api_key`) and by value: Luhn PAN (13-19 digits, also as numeric values), CPF/CNPJ check digits, e-mail, formatted BR phone, JWT and Bearer tokens.
- Backend: Masks: PAN `•••• •••• •••• 1234`, SAD `[REDACTED]`, secrets `••••`, CPF `•••.•••.•••-12`, e-mail `j•••@d•••.com`, phone `(••) •••••-1234`, other personal fields first letter + `•••`.
- Backend: Probe boundary: `CheckRunner` evaluates conditions on the raw result in memory, then returns a `CheckResult` with masked payload (SQL rows, JSON body by key/value, sensitive headers), masked condition values/messages and masked error text.
- Backend: Next: Jackson serialization guard and Logback masking converter.
- Frontend: `detectSensitive` / `redact` mirror the backend redactor: Luhn PAN 13-19 digits (spaces/hyphens, numbers, inside free text and JSON) → `•••• •••• •••• 1234`; CVV/CVC/track/PIN by field name → `[REDACTED]`; CPF/CNPJ with valid check digits → `•••.•••.•••-12` / `••.•••.•••/••••-81`; e-mail → `j•••@d•••.com`; JWT, Bearer and secret field names → `••••`.
- Frontend: Classification by field name or by value; non-sensitive values keep their type; redaction is idempotent.
- Frontend: `<SafeValue>` / `useSafeValue` render the masked text with `data-masked`/`data-class` and an i18n description ("Card data is always masked (PCI DSS)"); copying copies the masked text only; there is no unmask control.
- Frontend: Every probe-value renderer (preview table, hero, timeline, also active, matrix, near threshold, monitor list, chart description, readings) goes through `<SafeValue>` or `safeText`; attributes (`title`, `aria-label`) use `safeText`.
- Frontend: Wall surface (`surface="wall"`) hides personal data entirely (`•••`) instead of masking it; card data keeps the last-4 mask.
- Frontend: The preview shows a `role=note` PCI notice whenever the result contains card data.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: redaction core (detectors and masks) in orbit-common.
- 2026-10-18 — backend: probe-boundary redaction (PayloadRedactor + CheckRunner).
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: Luhn-based PAN redaction and detectors in `src/shared/privacy`.
- 2026-10-18 — frontend: `<SafeValue>` and `useSafeValue`.
- 2026-10-18 — frontend: every existing renderer routed through `<SafeValue>`; the wall hides personal data.
