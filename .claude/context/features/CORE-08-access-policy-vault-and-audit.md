---
id: CORE-08
title: "Access policy, vault and audit"
area: full-stack
group: "Security"
status: in-progress
screens: [settings, audit-log]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-08 · Access policy, vault and audit

## Summary
No login. Mutations only from loopback by default (configurable LAN/CIDR), view-only otherwise; self-declared operator name; AES-256-GCM secrets inside config files; audit in memory + masked JSON log.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[settings](../screens/settings.md), [audit-log](../screens/audit-log.md)

## Code
- `backend/orbit-security/src/main/java/io/orbit/security/access/AccessPolicy.java`
- `backend/orbit-security/src/main/java/io/orbit/security/vault/MasterKey.java`
- `backend/orbit-security/src/main/java/io/orbit/security/vault/SecretCipher.java`
- `backend/orbit-security/src/main/java/io/orbit/security/vault/SecretRef.java`
- `backend/orbit-security/src/main/java/io/orbit/security/vault/SecretResolver.java`
- `backend/orbit-security/src/main/java/io/orbit/security/audit/AuditLog.java`

## Tests
- `backend/orbit-security/src/test/java/io/orbit/security/access/AccessPolicyTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/vault/VaultTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/audit/AuditLogTest.java`

## Decisions and notes
- Backend: Access policy: READ always allowed; MUTATE from loopback only by default, `LAN` adds RFC 1918/ULA/link-local, `CIDR` adds listed ranges; ACKNOWLEDGE allowed for view-only clients unless `lanAcknowledge` is off.
- Backend: Vault: 256-bit `master.key` generated on first run (owner-only where POSIX); AES-256-GCM tokens `v1:<base64(iv|ciphertext)>` with random 96-bit IV; config secrets are `{"enc": "v1:..."}` or `"${env:NAME}"`, plain text is refused on load; API shows `•••• (vault)`.
- Backend: Audit: in memory for 24 h (newest first) plus one masked JSON line per entry on logger `orbit.audit`; filter by action prefix, target and operator; `anonymize(name)` for LGPD art. 18.
- Backend: Text redaction also masks `password=`, `token:`, `api_key` style key/value secrets.
- Backend: Pending: servlet filter applying the policy (BE-44), `X-Orbit-Operator` header (BE-45), audit endpoint (BE-46).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: access policy, vault and audit trail domain.
