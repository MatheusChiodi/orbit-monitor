---
id: CORE-04
title: "HTTP probe with SSRF protection"
area: backend
group: "Probe"
status: in-progress
screens: [monitor-editor-http]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-04 · HTTP probe with SSRF protection

## Summary
Resolves DNS and blocks private ranges and cloud metadata unless allowlisted per workspace.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md)

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/http/HttpProbe.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/http/SsrfGuard.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/http/Cidr.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/http/HostResolver.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/http/SsrfGuardTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/http/HttpProbeTest.java`

## Decisions and notes
- Blocks loopback, RFC 1918, link-local (cloud metadata), CGNAT, multicast, IPv6 ULA/link-local and known metadata host names; allowlist accepts host names and CIDR ranges.
- Redirects are followed manually (max 5) so every hop is re-checked.
- Known gap: DNS is resolved again by the HTTP client (rebinding window); pinning the resolved address is a follow-up.
- Pending: allowlist read from `orbit.settings.json` and redaction at the probe boundary (CORE-16).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — HttpProbe and SsrfGuard implemented; settings wiring and redaction pending.
