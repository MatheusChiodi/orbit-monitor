---
id: BE-09
title: "gRPC health probe"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-09 · gRPC health probe

## Summary
Standard `grpc.health.v1` check

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/grpc/GrpcHealthProbe.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/grpc/GrpcJavaHealthClient.java`
- `backend/pom.xml`
- `backend/orbit-probe/pom.xml`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/grpc/GrpcHealthProbeTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/grpc/GrpcJavaHealthClientTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`

## Decisions and notes
- grpc.health.v1 client port; SERVING = OK, anything else or errors = DOWN.
- `GrpcHealthProbe` keeps a client port so the state mapping is tested without a server; the production adapter is `GrpcJavaHealthClient`.
- SERVING is OK; NOT_SERVING, SERVICE_UNKNOWN, UNKNOWN and any exception (deadline exceeded, unavailable) are DOWN with the reason in `error`.
- Wired 2026-10-22: check type `GRPC` with `host`, `port`, `probe: {service, tls}`; payload `STATUS`.
- Decision: grpc-java 1.84.0 (Apache-2.0, Google-maintained, imported via `grpc-bom`) with the **OkHttp transport** (client only, ~260 KB plus okio/guava) instead of `grpc-netty-shaded` (~10 MB, server and client). The two health messages have one field each, so they are encoded by hand with a byte marshaller: no protobuf runtime, no generated stubs, no `grpc-services`. Rejected: a hand-written HTTP/2 client (JDK `HttpClient` cannot do h2c prior knowledge nor read trailers). 1.85.x was skipped because it was published less than two weeks ago. Sources: https://github.com/grpc/grpc-java (README, transports), https://github.com/grpc/grpc/blob/master/doc/health-checking.md
- `NOT_FOUND` maps to SERVICE_UNKNOWN (protocol), `UNIMPLEMENTED` is reported as "does not implement grpc.health.v1"; one channel per target is reused and closed on shutdown; max inbound message 4 KB; the target passes the SSRF guard. Tested against an in-process grpc-java server (`grpc-inprocess`, test scope).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented gRPC health probe over a client port; errors reported, not thrown (status: done).
- 2026-10-22 — real grpc-java (OkHttp) health client wired into the runtime and the monitor API.
