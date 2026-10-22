---
id: BE-35
title: "Notification templates"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-35 · Notification templates

## Summary
Variables and i18n (en/pt-BR); values redacted

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/template/NotificationTemplates.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/template/TemplateCatalog.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/template/NotificationTemplate.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/NotificationDispatcher.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/NotificationTemplateController.java`
- `backend/orbit-config/src/main/resources/schemas/orbit.notification-templates.schema.json`
- `backend/config-examples/orbit.notification-templates.example.json`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/template/NotificationTemplatesTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/template/TemplateCatalogTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/NotificationDispatcherTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/NotificationTemplateApiTest.java`

## Decisions and notes
- `{{var}}` templates per language tag with English fallback; every value goes through the redactor.
- Built-in templates (title + text, en and pt-BR) in `TemplateCatalog`: incident.down, incident.warn, incident.reopened, incident.severity, incident.resolved, incident.flapping, incident.escalation, incident.oncall (line appended when a step names the on-call person), channel.test. `orbit.notification-templates.json` items `{id, title{en?, pt-BR?}, text{en?, pt-BR?}}` override only the languages they carry; unknown ids or languages are 422. Variables: monitor, group, severity, detail, link, incidentId, openedAt, duration, ticket, step, onCall; every value is redacted, and the dispatcher masks the rendered text again.
- Used by channel delivery: each channel renders in its `locale` (en default, pt-BR).
- REST: `GET /api/notification-templates` -> `{templates[{id, title{en, pt-BR}, text{en, pt-BR}, custom}], variables[]}`; `PUT /api/notification-templates/{id} {title?, text?}` -> the effective template; `DELETE /api/notification-templates/{id}` resets to the default (404 without override); `POST /api/notification-templates/{id}/preview {locale?, variables?}` -> `{title, text}` with sample values for missing variables, redacted.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — template rendering (en/pt-BR, redacted values) implemented. 
- 2026-10-22 — orbit.notification-templates.json store and API with preview; dispatcher renders every channel message from the templates (status: done).
