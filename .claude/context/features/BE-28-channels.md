---
id: BE-28
title: "Channels"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-28 · Channels

## Summary
SMTP, Teams, Slack, Telegram, HMAC-signed webhook, WhatsApp provider

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ChannelPayloads.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/ChannelPayloadsTest.java`

## Decisions and notes
- One masked Notification rendered per channel; webhooks signed `X-Orbit-Signature: sha256=HMAC(secret, timestamp.body)` with `X-Orbit-Timestamp`. Channel secrets live in orbit.channels.json as vault references.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
