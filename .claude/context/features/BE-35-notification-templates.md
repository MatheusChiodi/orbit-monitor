---
id: BE-35
title: "Notification templates"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-35 · Notification templates

## Summary
Variables and i18n (en/pt-BR); values redacted

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/template/NotificationTemplates.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/template/NotificationTemplatesTest.java`

## Decisions and notes
- `{{var}}` templates per language tag with English fallback; every value goes through the redactor.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
