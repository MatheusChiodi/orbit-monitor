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
- [x] Implemented (formatter, encoder and appender fragment; included by the app's logback-spring.xml)
- [x] All tests green, none pending

## Code
- `backend/orbit-history/src/main/java/io/orbit/history/applog/MaskedJsonFormatter.java`
- `backend/orbit-history/src/main/java/io/orbit/history/applog/MaskedJsonEncoder.java`
- `backend/orbit-history/src/main/resources/io/orbit/history/applog/file-appender.xml`

## Tests
- `backend/orbit-history/src/test/java/io/orbit/history/applog/MaskedJsonFormatterTest.java`
- `backend/orbit-history/src/test/java/io/orbit/history/applog/AppLogRotationTest.java` (configures Logback with the shipped fragment, checks the rolling policy and a masked JSON line on disk)

## Decisions and notes
- **Logback `RollingFileAppender` + `SizeAndTimeBasedRollingPolicy` with an own JSON encoder, shipped as an includable fragment.** The app already owns `logback-spring.xml` (CORE-16 console masking), so Boot's `logging.logback.rollingpolicy.*` properties do not apply; the fragment `io/orbit/history/applog/file-appender.xml` defines `ORBIT_FILE` and the app includes it next to the console appender. Rejected: logstash-logback-encoder (extra ~400 KB dependency and its own masking DSL); Boot's `StructuredLogEncoder` (needs the Spring `Environment` inside Logback, harder to test). Sources: https://logback.qos.ch/manual/appenders.html#SizeAndTimeBasedRollingPolicy · https://docs.spring.io/spring-boot/reference/features/logging.html
- Settings: `${ORBIT_DATA_DIR}/logs/orbit.log` (`~/.orbit/data` by default), rolled daily and at 50 MB to `orbit-YYYY-MM-DD.N.log.gz`, `maxHistory=30`, `totalSizeCap=512MB`, `cleanHistoryOnStart=true`.
- Each line: `@timestamp`, `level`, `logger`, `thread`, `message`, `mdc`, `exception`; message, MDC values and stack trace text go through `SensitiveDataRedactor` (PAN, CPF/CNPJ, e-mail, phone, JWT, bearer and key=value secrets). `MaskedJsonFormatter` also implements Boot's `StructuredLogFormatter`, so it can be used as a structured format.
- App wiring (orbit-api `logback-spring.xml`): `<springProperty name="ORBIT_DATA_DIR" source="orbit.data-dir" defaultValue="${user.home}/.orbit/data"/>`, `<include resource="io/orbit/history/applog/file-appender.xml"/>`, `<appender-ref ref="ORBIT_FILE"/>`.

## Changelog
- 2026-10-18 — context file created (status: in-progress).
