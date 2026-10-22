---
id: CORE-16
title: "Sensitive data protection (LGPD / PCI DSS)"
area: full-stack
group: "Privacy"
status: in-progress
screens: [wall, monitor-editor-sql, monitor-editor-http, data-and-display]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-16 · Sensitive data protection (LGPD / PCI DSS)

## Summary
Detect and redact PAN (Luhn), SAD, CPF/CNPJ, e-mail, phone, secrets at the probe boundary, serialization, logs and `<SafeValue>`. A full PAN is never displayed. See docs/04-data-protection.md.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [monitor-editor-sql](../screens/monitor-editor-sql.md), [monitor-editor-http](../screens/monitor-editor-http.md), [data-and-display](../screens/data-and-display.md)

## Code
- `frontend/src/shared/privacy/redact.ts`
- `frontend/src/shared/privacy/SafeValue/SafeValue.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.tsx`
- `frontend/src/domains/monitor/display/display.ts`
- `frontend/src/domains/wall/components/Hero/Hero.tsx`
- `frontend/src/domains/wall/components/Timeline/Timeline.tsx`
- `frontend/src/domains/wall/components/AlsoActive/AlsoActive.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.tsx`
- `frontend/src/domains/wall/components/NearLimit/NearLimit.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.tsx`
- `frontend/src/domains/monitor/rules/rules.ts`
- `frontend/src/shared/ui/ThresholdChart/ThresholdChart.tsx`
- `frontend/src/shared/ui/SecretInput/SecretInput.tsx`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/SensitiveDataRedactor.java`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/Luhn.java`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/BrazilianDocuments.java`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/DataClass.java`
- `backend/orbit-common/src/main/java/io/orbit/common/privacy/Sensitive.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/privacy/PayloadRedactor.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckRunner.java`
- `backend/orbit-api/src/main/java/io/orbit/api/privacy/SensitiveDataModule.java`
- `backend/orbit-api/src/main/java/io/orbit/api/privacy/MaskingConverter.java`
- `backend/orbit-api/src/main/java/io/orbit/api/privacy/MaskedThrowableConverter.java`
- `backend/orbit-config/src/main/java/io/orbit/config/ConfigFile.java`
- `.githooks/pre-commit`
- `backend/orbit-api/src/main/resources/logback-spring.xml`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/FieldDef.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/DefinitionValidators.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/PrimaryValue.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/SeriesMetrics.java`
- `backend/orbit-security/src/main/java/io/orbit/security/settings/SvgSanitizer.java`

## Tests
- `frontend/src/shared/privacy/redact.test.ts`
- `frontend/src/shared/privacy/SafeValue/SafeValue.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.privacy.test.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.privacy.test.tsx`
- `frontend/src/domains/monitor/display/display.privacy.test.ts`
- `frontend/src/domains/wall/components/Hero/Hero.privacy.test.tsx`
- `frontend/src/domains/wall/components/Timeline/Timeline.privacy.test.tsx`
- `frontend/src/domains/wall/components/AlsoActive/AlsoActive.privacy.test.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.privacy.test.tsx`
- `frontend/src/domains/wall/components/NearLimit/NearLimit.privacy.test.tsx`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.privacy.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.privacy.test.tsx`
- `frontend/src/app/console/ConsoleApp.privacy.test.tsx`
- `frontend/src/shared/ui/SecretInput/SecretInput.pending.test.tsx`
- `frontend/src/shared/ui/SecretInput/SecretInput.test.tsx`
- `backend/orbit-common/src/test/java/io/orbit/common/privacy/SensitiveDataRedactorTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/privacy/PayloadRedactorTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/CheckRunnerTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/privacy/SensitiveDataModuleTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/privacy/MaskingConverterTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/privacy/LogMaskingTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/privacy/MaskedThrowableConverterTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/privacy/CardDataLeakTest.java`
- `backend/orbit-config/src/test/java/io/orbit/config/ConfigFileTest.java`
- `.githooks/pre-commit.test.sh`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/ExtendedDefinitionsTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/PrimaryValueTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/settings/SvgSanitizerTest.java`

## Decisions and notes
- Frontend: `detectSensitive` / `redact` mirror the backend redactor: Luhn PAN 13-19 digits (spaces/hyphens, numbers, inside free text and JSON) → `•••• •••• •••• 1234`; CVV/CVC/track/PIN by field name → `[REDACTED]`; CPF/CNPJ with valid check digits → `•••.•••.•••-12` / `••.•••.•••/••••-81`; e-mail → `j•••@d•••.com`; JWT, Bearer and secret field names → `••••`.
- Frontend: Classification by field name or by value; non-sensitive values keep their type; redaction is idempotent.
- Frontend: `<SafeValue>` / `useSafeValue` render the masked text with `data-masked`/`data-class` and an i18n description ("Card data is always masked (PCI DSS)"); copying copies the masked text only; there is no unmask control.
- Frontend: Every probe-value renderer (preview table, hero, timeline, also active, matrix, near threshold, monitor list, chart description, readings) goes through `<SafeValue>` or `safeText`; attributes (`title`, `aria-label`) use `safeText`.
- Frontend: Wall surface (`surface="wall"`) hides personal data entirely (`•••`) instead of masking it; card data keeps the last-4 mask.
- Frontend: The preview shows a `role=note` PCI notice whenever the result contains card data.
- Frontend: Data & display: fields carry `dataClass`, `masked` and `showOnWall`; sensitive fields are never pre-selected; PCI fields show "PCI · masked", cannot be stored as a series nor unmasked; personal fields show "Personal data (LGPD)" and are masked by default; neither can be shown on the wall.
- Frontend: `SecretInput` is `type=password` + `autocomplete=off`, uncontrolled (the value never lands in a DOM attribute), no show toggle; stored secrets appear only as `•••• (vault)`.
- Backend: Layer 1, probe boundary: `CheckRunner` evaluates conditions on the raw result in memory, then returns only masked payload, condition values and errors.
- Backend: Layer 2, serialization: `SensitiveDataModule` (registered in Spring's ObjectMapper) re-masks every `ResultPayload`, `HttpResponseSnapshot` and `@Sensitive` property on the way out of REST and `/ws/wall`; `@Sensitive` values that look harmless are still masked generically.
- Backend: Layer 3, logs: `logback-spring.xml` uses `%maskedMsg` (`MaskingConverter`), so every log line, including formatted arguments, is masked.
- Backend: Masks: PAN `•••• •••• •••• 1234`, SAD `[REDACTED]`, secrets `••••`, CPF `•••.•••.•••-12`, e-mail `j•••@d•••.com`, phone `(••) •••••-1234`.
- Audit 2026-10-18 (both sides): PAN detection now scans every span of whole digit groups inside a run of digits joined by single spaces/hyphens, so a PAN next to another number ("order 12 5555 5555 5555 4444", a date, a quantity) is found; before, the greedy 13-19 digit match swallowed the extra digits, failed Luhn and leaked the card. Overlapping Luhn spans are merged and masked as one so no digit of either survives (over-masking is preferred to a leak). Frontend and backend use the same algorithm.
- Backend: `Double`/`Float` values that are integral and Luhn-valid are masked like `Long`/`BigDecimal` (a DOUBLE column could carry a PAN into a series).
- Backend: the Jackson guard also masks card numbers in every plain `String` value and map key (error messages, column aliases, JSON keys), but only card numbers, so e-mails and settings stay editable through the API. `JsonNode` trees are not covered by it; the probe-boundary redactor handles them.
- Backend: stack traces go through `MaskedThrowableConverter` (`%maskedEx`, replaces `%wEx`), so a JDBC error quoting a row cannot log a PAN.
- Backend: `ConfigFile` rejects (save) and refuses to serve (external edit) any `orbit.<feature>.json` whose values or keys contain a card number; the error names the path, never the value; `{"enc": ...}` secrets are skipped. PCI DSS 3.5 for configuration files.
- Backend: `CardDataLeakTest` (end to end, H2 + RANDOM_PORT) puts a PAN in a text column, BIGINT, DOUBLE, free text next to another number, JSON text and a column alias, then checks preview, save, run, detail, list, wall snapshot, incidents, audit, `/ws/wall` frames, history events/audit/samples/series, every file under the config and data directories and the whole console output.
- Hook: `.githooks/pre-commit` now scans test files too (only the well-known public test PANs are allowed; other test numbers are built at runtime), uses the same group-span Luhn search restricted to spans starting with 2-6 (card IINs; avoids Luhn-valid epoch milliseconds), handles paths with spaces, blocks `*.key`, `*.pfx`, `id_rsa`, `id_ed25519` and prints only `****1234` of a match. `sh .githooks/pre-commit.test.sh` runs 12 cases in throwaway repositories; the previous hook failed 2 of them (PAN in a test file, PAN next to another number).
- Research: log masking via a custom Logback `ClassicConverter`/`ThrowableProxyConverter` (chosen: no dependency, works with Spring Boot's console pattern) vs. logstash-logback-encoder `MaskingJsonGeneratorDecorator` (JSON output only, extra dependency) vs. regex `replace` in the pattern (no Luhn check, would mask every 16-digit number). For the hook, a POSIX awk scan (no runtime needed) vs. gitleaks/detect-secrets (strong for secrets, but they need an extra binary per clone; whether their card rules apply Luhn was not verified). Luhn per ISO/IEC 7812-1.
- Open: the BE-37 config export is not implemented yet; it reads the same `ConfigFile`s, which can no longer hold a PAN. CSV/PDF exports do not exist yet; when they do they must go through the redactor and get a test in `CardDataLeakTest`.
- Open: the hook is not enabled in the shared clone (`core.hooksPath` unset).
- Backend (2026-10-22): `FieldDef` stores `masked` and `showOnWall` from the console; saving rejects a card field with `masked: false` and any personal or card field with `showOnWall: true`. The wall value (`PrimaryValue`) never comes from a personal or card column/path, even a numeric one (e.g. a CPF stored as a number); series never keep card fields (`SeriesMetrics`, plus `MetricExtractor`).
- Backend: the workspace logo (FE-10) is an allowlist-sanitized SVG (`SvgSanitizer`: no DOCTYPE/entities, no scripts, handlers, foreignObject, style, external or javascript references).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: redaction core (detectors and masks) in orbit-common.
- 2026-10-18 — backend: probe-boundary redaction (PayloadRedactor + CheckRunner).
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: Luhn-based PAN redaction and detectors in `src/shared/privacy`.
- 2026-10-18 — frontend: `<SafeValue>` and `useSafeValue`.
- 2026-10-18 — frontend: every existing renderer routed through `<SafeValue>`; the wall hides personal data.
- 2026-10-18 — frontend: Data & display privacy badges and minimization rules.
- 2026-10-18 — frontend: frontend: secret input.
- 2026-10-18 — backend: pending tests for the Jackson serialization guard and the Logback masking converter.
- 2026-10-18 — backend: Jackson serialization guard and Logback masking converter implemented.
- 2026-10-18 — audit: PAN next to other numbers, floating-point PANs, plain strings in the API, stack traces and config files closed; frontend phone and key=value secret masks; end-to-end leak test; pre-commit hook hardened with tests.
- 2026-10-22 — backend: personal/card fields cannot reach the wall or be unmasked; card fields never become series.
