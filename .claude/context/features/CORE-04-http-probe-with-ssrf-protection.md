---
id: CORE-04
title: "HTTP probe with SSRF protection"
area: backend
group: "Probe"
status: done
screens: [monitor-editor-http]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-04 · HTTP probe with SSRF protection

## Summary
Resolves DNS and blocks private ranges and cloud metadata unless allowlisted per workspace.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md)

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/http/HttpProbe.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/http/SsrfGuard.java`
- `backend/orbit-common/src/main/java/io/orbit/common/net/Cidr.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/http/HostResolver.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/DomainBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/RuntimeBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/ExtendedProbeBeans.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/http/SsrfGuardTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/http/HttpProbeTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/CheckRunnerTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`

## Decisions and notes
- Default policy (local-first): loopback and private ranges are reachable; cloud metadata is always blocked, even when allowlisted (link-local 169.254.0.0/16 and fe80::/10, Alibaba 100.100.100.200, AWS fd00:ec2::254, metadata host names); multicast/reserved never.
- `orbit.http.block-private=true` also blocks loopback, RFC 1918, CGNAT and IPv6 ULA unless `orbit.http.allowlist` (host names or CIDR) reopens them.
- Redirects are followed manually (max 5) so every hop is re-checked.
- Known gap: DNS is resolved again by the HTTP client (rebinding window); pinning the resolved address is a follow-up.
- Redaction at the probe boundary is done by `CheckRunner` (CORE-16).
- Settings wiring: `orbit.http.block-private` and `orbit.http.allowlist` (application.yml / environment) build the `SsrfGuard` used by the HTTP probe, the TCP/ping checks and every newer probe (TLS/RDAP, gRPC, Kafka bootstrap, OAuth2 token URL, multi-step hops). Redaction happens in `CheckRunner` before results leave the probe boundary.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — HttpProbe and SsrfGuard implemented; settings wiring and redaction pending.
- 2026-10-18 — private ranges allowed by default, metadata always blocked, block-private switch.
- 2026-10-22 — SSRF settings applied to every probe and redaction at the boundary confirmed (status: done; DNS rebinding pinning stays a documented follow-up).
