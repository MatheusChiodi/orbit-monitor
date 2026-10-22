---
id: BE-28
title: "Channels"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-28 · Channels

## Summary
SMTP, Teams, Slack, Telegram, HMAC-signed webhook, WhatsApp provider

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ChannelPayloads.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ChannelDef.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/NotificationDispatcher.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ChannelController.java`
- `backend/config-examples/orbit.channels.example.json`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ChannelDelivery.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/EmailSender.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/SmtpEmailSender.java`
- `backend/orbit-config/src/main/resources/schemas/orbit.channels.schema.json`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/ChannelPayloadsTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/NotificationDispatcherTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AlertingApiTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/ChannelDeliveryTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/SmtpEmailSenderTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ChannelApiTest.java`

## Decisions and notes
- `NotificationDispatcher` listens to incidents: opened, reopened, severity change and resolved notify; acknowledgements and comments do not. Filters by channel group list and minimum severity; silenced/maintained monitors or groups are skipped; texts are masked again before sending.
- Webhooks carry `X-Orbit-Signature: sha256=HMAC(secret, timestamp.body)` and `X-Orbit-Timestamp`; delivery goes through the SSRF guard and `ReliableSender` (rate limit, retries, dead letters).
- Links use `orbit.public-url` (`ORBIT_PUBLIC_URL`).
- Types SLACK, TEAMS, WEBHOOK, EMAIL, TELEGRAM, WHATSAPP. `ChannelDelivery` builds one payload per delivery (one per Telegram chat / WhatsApp phone) and delivers it; `NotificationDispatcher` decides what to send and renders it with the BE-35 templates in the channel `locale`. Secrets (`url`, `signingSecret`, `token` = Telegram bot token / WhatsApp bearer / SMTP password) are vault refs resolved only at delivery; the Telegram token lives only in the request URL and is replaced by `••••` in any error kept in the dead-letter queue.
- E-mail: `EmailSender` port, production `SmtpEmailSender` on Jakarta Mail (Eclipse Angus Mail, EPL-2.0/GPL-2.0+CE/BSD-3, version managed by Spring Boot): per-channel session, `security` NONE / STARTTLS (default, required) / TLS (implicit), server identity checked, 15 s timeouts, UTF-8 plain text, `Auto-Submitted: auto-generated`. The SMTP host goes through the same `SsrfGuard` as HTTP channels. Tested against GreenMail (Apache-2.0) in-process SMTP. Alternatives: Spring `JavaMailSender` (one global `spring.mail.*` server, while each channel has its own) and Simple Java Mail (extra layer over the same Angus engine). Sources: https://eclipse-ee4j.github.io/angus-mail/ , https://greenmail-mail-test.github.io/greenmail/ , https://github.com/bbottema/simple-java-mail/issues/495
- Telegram: Bot API `POST {base}/bot<token>/sendMessage {chat_id, text, disable_web_page_preview}`; `url` optionally overrides the base (tests, proxies). WhatsApp provider: Meta WhatsApp Cloud API shape (`POST <url>` with `Authorization: Bearer <token>`, `{messaging_product, to, type: text}`); with `providerTemplate` it sends an approved template message (body parameters: title, text+link), which Meta requires for business-initiated messages outside the 24-hour window. Twilio-style form APIs are not supported (would be another `ChannelDelivery` branch).
- Validation (`ChannelDelivery.problems`, file validator, 422): url for webhooks/WhatsApp, token for Telegram/WhatsApp, recipients for e-mail/Telegram/WhatsApp, E.164 phones, valid addresses (reported by index, never the address), smtp.host/from, security NONE|STARTTLS|TLS, locale en|pt-BR, minSeverity WARN|DOWN.
- REST: `GET /api/channels` -> `[{id, name, type, url, signingSecret, token, recipients, smtp{host, port, username, from, security}, groupIds, minSeverity, enabled, locale, providerTemplate}]` with secrets as `•••• (vault)` and recipients masked (`o•••@e•••.com`, `••••3210`; GET is open to LAN clients); `PUT /api/channels/{id}` same fields in clear (omitted secrets, or recipients omitted / still masked, keep the stored ones); `DELETE /api/channels/{id}`; `POST /api/channels/{id}/test` -> `{delivered, error}` sends the localized "channel.test" message once (no retries); `GET /api/channels/dead-letters` -> `[{channelId, error, attempts}]` (BE-36).
- Verified against local fakes only (HTTP server for Telegram/WhatsApp, GreenMail for SMTP); no live Telegram/Meta/SMTP account was used.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — Slack, Teams and signed webhook payloads implemented; delivery and orbit.channels.json pending.
- 2026-10-18 — Slack/Teams/webhook delivery wired to incidents with channel config and API.
- 2026-10-22 — SMTP e-mail, Telegram and WhatsApp-provider channels, per-channel language, test endpoint and masked recipients (status: done).
