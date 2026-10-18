---
id: CORE-18
title: "Application skeleton and health"
area: backend
group: "Platform"
status: done
screens: []
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-18 · Application skeleton and health

## Summary
Maven multi-module, `orbit-api` app, `/actuator/health`.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/OrbitApplication.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/HealthEndpointTest.java`

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: done).
