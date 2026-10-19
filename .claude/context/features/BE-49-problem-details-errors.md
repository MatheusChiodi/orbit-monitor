---
id: BE-49
title: "Problem Details errors"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-49 · Problem Details errors

## Summary
RFC 9457 responses with stable codes and i18n messages; OpenAPI

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/ProblemHandler.java`
- `backend/orbit-api/src/main/resources/messages.properties`
- `backend/orbit-api/src/main/resources/messages_pt_BR.properties`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/ProblemI18nTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/MessageBundlesTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/OpenApiTest.java`

## Decisions and notes
- RFC 9457 with stable `code`, translated `title`/`detail` (en, pt-BR); OpenAPI at `/v3/api-docs` documents every endpoint.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — Problem Details handler with stable codes.
- 2026-10-18 — i18n Problem Details and OpenAPI covered (status: done).
