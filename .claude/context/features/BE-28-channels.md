---
id: BE-28
title: "Channels"
area: backend
group: "Alerting"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-28 · Channels

## Summary
SMTP, Teams, Slack, Telegram, HMAC-signed webhook, WhatsApp provider

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ChannelPayloads.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ChannelDef.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/NotificationDispatcher.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ChannelController.java`
- `backend/config-examples/orbit.channels.example.json`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/ChannelPayloadsTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/NotificationDispatcherTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AlertingApiTest.java`

## Decisions and notes
- Channels in `orbit.channels.json` (`GET/PUT/DELETE /api/channels`): SLACK, TEAMS, WEBHOOK; the URL (it carries tokens) and the HMAC secret are vault references, never returned.
- `NotificationDispatcher` listens to incidents: opened, reopened, severity change and resolved notify; acknowledgements and comments do not. Filters by channel group list and minimum severity; silenced/maintained monitors or groups are skipped; texts are masked again before sending.
- Webhooks carry `X-Orbit-Signature: sha256=HMAC(secret, timestamp.body)` and `X-Orbit-Timestamp`; delivery goes through the SSRF guard and `ReliableSender` (rate limit, retries, dead letters).
- Links use `orbit.public-url` (`ORBIT_PUBLIC_URL`).
- Pending: SMTP e-mail, Telegram and WhatsApp providers.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — Slack, Teams and signed webhook payloads implemented; delivery and orbit.channels.json pending.
- 2026-10-18 — Slack/Teams/webhook delivery wired to incidents with channel config and API.
