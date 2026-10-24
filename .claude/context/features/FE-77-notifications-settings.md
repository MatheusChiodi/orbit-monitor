---
id: FE-77
title: "Settings › Notifications: channels, delivery failures, messages, escalation, on-call"
area: frontend
group: "Alerting"
status: done
screens: [settings]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-77 · Notifications settings

## Summary
One Settings section (`#/settings/notifications`) that makes the alerting backend usable from the console: notification channels (BE-28) with add/edit/delete and "Send test", delivery failures (BE-36 dead letters), message templates per language with preview and reset (BE-35), escalation policies with timed steps plus the next escalations (BE-27, FE-40), and on-call rotations with "On call now" (BE-33).

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] Mounted as Settings › Notifications (`#/settings/notifications`, FE-72); palette action "Add notification channel" requested from the shell (FE-63)

## Code
- `frontend/src/domains/notifications/NotificationsSettings/NotificationsSettings.tsx` (default export; optional `api`, `editable`, `initialTab`)
- `frontend/src/domains/notifications/api/notificationsApi.ts` (client for `/api/channels`, `/api/notification-templates`, `/api/escalation`, `/api/oncall`)
- `frontend/src/domains/notifications/ChannelsTab`, `ChannelDialog`, `FailuresTab`, `TemplatesTab`, `TemplateDialogs`, `EscalationTab`, `PolicyDialog`, `OnCallTab`, `ScheduleDialog`, `GroupScope`, `LoadError`
- `frontend/src/domains/notifications/model/` (`channelForm.ts`, `policyForm.ts`, `deliveryError.ts`, `queries.ts`, `time.ts`)
- `frontend/src/domains/notifications/locales/en.json`, `pt-BR.json` (i18n namespace `notificationSettings`; `notifications` is the bell's)

## Tests
- `frontend/src/domains/notifications/api/notificationsApi.test.ts`
- `frontend/src/domains/notifications/model/channelForm.test.ts`, `policyForm.test.ts`, `deliveryError.test.ts`
- `frontend/src/domains/notifications/NotificationsSettings/NotificationsSettings.channels.test.tsx`, `NotificationsSettings.flows.test.tsx`

## Decisions and notes
- Built only on `@/shared/ui` primitives (Tabs, Table, Dialog, Menu, Field, SecretInput, EmptyState, StatusBadge, Toast) and TanStack Query; no new dependency.
- Secrets (webhook URL, signing secret, bot/provider token, SMTP password) are typed in `SecretInput` (password, no reveal) inside a dialog that remounts on every open; they are never prefilled and an empty field keeps the vault value (the API omits it). Changing the channel kind asks for its secrets again.
- Recipients come back masked from the API; the form shows the masked list as a hint and only sends a list when the operator types a new one.
- Fields per kind follow `ChannelDef`: Slack/Teams webhook; Webhook URL + optional HMAC secret; E-mail recipients + SMTP (host, port, security, user, password, from); Telegram bot token + chat ids + optional Bot API base; WhatsApp endpoint + token + E.164 numbers + optional approved template.
- Ids are slugs of the name (file keys, never shown). Escalation `Duration` is read as ISO-8601 or seconds and written as `afterMinutes`.
- Delivery errors are explained in plain words (connection refused, unknown host, timeout, TLS, rejected credentials, HTTP status) with the masked technical detail kept under it on the failures tab.
- Template edits send only the languages that changed on a default template (others keep following the built-in text); a customized template sends both. Preview renders the saved text (server redacts like real deliveries).
- On-call edits keep existing shift swaps (overrides) untouched; editing them is out of scope for now.
- `editable` defaults to `GET /api/access` (`view-only` hides every action); Settings should pass the console's `editable`.

## Changelog
- 2026-10-24 — channels CRUD + test, delivery failures, message templates, escalation policies + next escalations, on-call schedules + on call now (status: in-progress).
- 2026-10-24 — mounted in Settings; plain-language delivery errors; SMTP password inside the mail server group (status: done).
