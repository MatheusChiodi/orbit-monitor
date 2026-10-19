---
id: BE-53
title: "Application log rotation"
area: backend
group: "History"
status: in-progress
screens: []
spec: docs/08-logs-and-history.md
updated: 2026-10-18
---

# BE-53 · Application log rotation

## Summary
Logback SizeAndTimeBasedRollingPolicy: daily, 50 MB files, gzip, 30 days, total size cap, JSON encoder with masking.

## Status
- [x] Tests written (pending or active)
- [x] Implemented (formatter + shipped properties; the app imports them in BE-52 wiring)
- [x] All tests green, none pending

## Code
- `backend/orbit-history/src/main/java/io/orbit/history/applog/MaskedJsonFormatter.java`
- `backend/orbit-history/src/main/resources/orbit-logging.properties`

## Tests
- `backend/orbit-history/src/test/java/io/orbit/history/applog/MaskedJsonFormatterTest.java`
- `backend/orbit-history/src/test/java/io/orbit/history/applog/AppLogRotationTest.java` (boots Spring Boot's `LogbackLoggingSystem` with the shipped properties and checks the rolling policy and a masked line on disk)

## Decisions and notes
- **Spring Boot 3.4 structured logging with a custom formatter instead of a Logback XML + logstash-logback-encoder.** `logging.structured.format.file` accepts a `StructuredLogFormatter` class, and Boot's programmatic file appender already uses `SizeAndTimeBasedRollingPolicy`, configured through `logging.logback.rollingpolicy.*`. No extra dependency (logstash-logback-encoder would add ~400 KB and its own masking DSL) and no XML to keep in sync. Source: https://docs.spring.io/spring-boot/reference/features/logging.html
- Settings: `~/.orbit/data/logs/orbit.log` (follows `orbit.data-dir`), rolled daily and at 50 MB to `orbit-YYYY-MM-DD.N.log.gz`, `max-history=30`, `total-size-cap=512MB`, `clean-history-on-start=true`.
- Each line: `@timestamp`, `level`, `logger`, `thread`, `message`, `mdc`, `exception`; message, MDC values and the stack trace text go through `SensitiveDataRedactor` (PAN, CPF/CNPJ, e-mail, phone, JWT, bearer and key=value secrets).
- The properties live in the history module and are imported by the app (`spring.config.import=classpath:orbit-logging.properties`), so the test and the runtime read the same file.
- Open: console output stays Boot's plain pattern (not masked); masking the console needs a Logback conversion rule — to agree with orbit-privacy.

## Changelog
- 2026-10-18 — context file created (status: in-progress).
