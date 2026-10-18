---
id: CORE-08
title: "Access policy, vault and audit"
area: full-stack
group: "Security"
status: planned
screens: [settings, audit-log]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-08 · Access policy, vault and audit

## Summary
No login. Mutations only from loopback by default (configurable LAN/CIDR), view-only otherwise; self-declared operator name; AES-256-GCM secrets inside config files; audit in memory + masked JSON log.

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[settings](../screens/settings.md), [audit-log](../screens/audit-log.md)

## Code
_None yet._

## Tests
_None yet._

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
