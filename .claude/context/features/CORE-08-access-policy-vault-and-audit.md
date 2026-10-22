---
id: CORE-08
title: "Access policy, vault and audit"
area: full-stack
group: "Security"
status: done
screens: [settings, audit-log]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-08 · Access policy, vault and audit

## Summary
No login. Mutations only from loopback by default (configurable LAN/CIDR), view-only otherwise; self-declared operator name; AES-256-GCM secrets inside config files; audit in memory + masked JSON log.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[settings](../screens/settings.md), [audit-log](../screens/audit-log.md)

## Code
- `frontend/src/domains/security/operator/operator.ts`
- `frontend/src/domains/security/OperatorPrompt/OperatorPrompt.tsx`
- `frontend/src/domains/security/access/access.ts`
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.tsx`
- `frontend/src/shared/api/client.ts`
- `backend/orbit-security/src/main/java/io/orbit/security/access/AccessPolicy.java`
- `backend/orbit-security/src/main/java/io/orbit/security/settings/SettingsService.java`
- `backend/orbit-security/src/main/java/io/orbit/security/settings/OrbitSettings.java`
- `backend/orbit-security/src/main/java/io/orbit/security/settings/WorkspaceDefaults.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/Editors.java`
- `backend/orbit-security/src/main/java/io/orbit/security/vault/SecretCipher.java`
- `backend/orbit-security/src/main/java/io/orbit/security/audit/AuditLog.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AccessFilter.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/SettingsController.java`
- `backend/config-examples/orbit.settings.example.json`

## Tests
- `frontend/src/domains/security/operator/operator.test.ts`
- `frontend/src/domains/security/OperatorPrompt/OperatorPrompt.test.tsx`
- `frontend/src/domains/security/access/access.test.ts`
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.test.tsx`
- `frontend/src/shared/api/client.test.ts`
- `backend/orbit-security/src/test/java/io/orbit/security/settings/SettingsServiceTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/settings/WorkspaceDefaultsTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/audit/AuditPagingTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AccessAndGroupsApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/SettingsFileTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/access/AccessPolicyTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/vault/VaultTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/audit/AuditLogTest.java`

## Decisions and notes
- Frontend: No login: the console asks once for a self-declared operator name (max 60 chars, `localStorage` key `orbit.operator`, try/catch) and sends it percent-encoded in `X-Orbit-Operator`.
- Frontend: `GET /api/access` → `{ mode: edit | view-only }`; anything unexpected is view-only (fail closed). In view-only the console hides every edit action and shows "View-only: edits are allowed only on the machine running Orbit".
- Frontend: The client never sends an `Authorization` header and uses `cache: 'no-store'`.
- Backend: Access policy: READ always allowed; MUTATE from loopback only by default, `lan` adds RFC 1918/ULA/link-local, `cidr` adds listed ranges; ACKNOWLEDGE allowed for view-only clients unless `lanAcknowledge` is off.
- Backend: `orbit.settings.json` (`GET/PUT /api/settings`) overrides `orbit.access.*`; the filter reads the policy on every request, so a change applies at once; external edits are reloaded every 5 s.
- Backend: Vault: AES-256-GCM tokens `v1:...` with `~/.orbit/master.key`; config secrets are `{"enc": ...}` or `${env:NAME}`; API shows `•••• (vault)`.
- Backend: Audit: 24 h in memory plus masked JSON lines on `orbit.audit`; `settings.save` is audited. Query with filters, time range and pagination: BE-46.
- Backend: `orbit.settings.json` also holds the workspace defaults (BE-40: theme, animationLevel, density, locale, scale), validated against the frontend values; `GET/PUT /api/settings/defaults`. Saving defaults keeps the access section and vice versa.
- Backend: every new config endpoint (variables, themes, status pages, workspaces, customization, terminology, group order) goes through the same `AccessFilter` (mutations from allowed addresses only, `X-Orbit-Operator` required, audited). `Editors` exposes the same decision to controllers that answer differently by client (internal status pages).
- Backend: vault values in `orbit.variables.json` (BE-39) use the same AES-256-GCM `SecretRef` and are shown only as `•••• (vault)`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: access policy, vault and audit trail domain.
- 2026-10-18 — frontend: login and session removed; operator name prompt and access mode banner.
- 2026-10-18 — backend: pending tests for access policy and defaults in orbit.settings.json.
- 2026-10-18 — backend: access policy and defaults read from orbit.settings.json.
- 2026-10-22 — backend: workspace defaults (theme, animation, density, locale, scale) in orbit.settings.json over /api/settings/defaults; audit time range and pagination; editor checks for the new config endpoints (status: done).
