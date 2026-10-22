---
id: BE-05
title: "Certificate and domain expiry"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-05 · Certificate and domain expiry

## Summary
Days left, chain and issuer; domain expiry via RDAP; 30/14/7-day warnings

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/cert/ExpiryPolicy.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/cert/TlsCertificateFetcher.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/cert/RdapClient.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/cert/CertificateProbe.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/ExtendedChecks.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/Notice.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/cert/ExpiryPolicyTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/cert/TlsCertificateFetcherTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/cert/CertificateProbeTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallPublisherI18nTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/HistoryRecorderTest.java`

## Decisions and notes
- OK > 30 days, WARN 30..8, DOWN <= 7; warning steps 30/14/7; domain expiry from RDAP `expiration` event.
- RDAP JSON is read with the Jackson tree model already on the classpath (no RDAP client library); invalid JSON or a missing `expiration` event yields empty.
- `warningStep` returns the smallest step already crossed (30, 14 or 7) so callers notify once per step.
- Wired 2026-10-22: check type `CERT` with `host`/`port` (443 by default) for the certificate and/or `probe.domain` for the registration; `[CERT_DAYS_LEFT]` is the fewest days of both. Payload: `CERT_DAYS_LEFT`, `CERT_EXPIRES_AT`, `ISSUER`, `SUBJECT`, `CHAIN_LENGTH`, `TRUSTED`, `DOMAIN_DAYS_LEFT`, `DOMAIN_EXPIRES_AT`. HTTPS monitors keep `[CERT_DAYS_LEFT]` from the HTTP probe.
- Certificate read with a JDK TLS handshake (`SSLSocket`, SNI, endpoint identification HTTPS) through a recording trust manager: the chain is always read, the JDK trust store verdict is reported (`TRUSTED`); an untrusted chain is at least WARN. No application data is sent. Alternative rejected: reading `HttpClient` sessions (aborts on an expired/untrusted certificate, which is exactly when the operator needs the date).
- RDAP (RFC 9083) via the `rdap.org` bootstrap redirector (`orbit.rdap.base-url`), through `HttpProbe` (SSRF guard on every hop); answers cached 12 h, failures 5 min. Rejected: WHOIS over port 43 (free text per registry) and an RDAP client library (one JSON field is needed).
- 30/14/7-day warnings: crossing a step publishes a `Notice` (`cert.warning`, key `notice.cert.warning`) once per step; it becomes an INFO entry on the wall timeline and a `cert.warning` event in the 30-day history; renewal resets the steps. State: WARN from 30 days (incident with `openOnWarn`), DOWN at 7 days or less.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented expiry states, 30/14/7 warning steps and RDAP expiration parsing (status: done).
- 2026-10-22 — TLS fetcher, RDAP client and CERT check type wired into the runtime, API, wall timeline and history (30/14/7-day notices).
