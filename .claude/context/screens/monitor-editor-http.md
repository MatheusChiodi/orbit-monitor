---
screen: monitor-editor-http
title: "HTTP monitor editor"
route: "index.html#/monitors/new/http"
status: planned
spec: docs/02-features.md §2.1
updated: 2026-10-18
---

# HTTP monitor editor

## Purpose
Request config left, live preview right (status, time, headers, body), conditions.

## Layout and components
_To be filled as the screen is built (component tree, file paths)._

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-01 · Gatus-style conditions](../features/CORE-01-gatus-style-conditions.md) — done
- [CORE-04 · HTTP probe with SSRF protection](../features/CORE-04-http-probe-with-ssrf-protection.md) — planned
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — planned
- [CORE-16 · Sensitive data protection (LGPD / PCI DSS)](../features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) — planned
- [FE-34 · Condition builder](../features/FE-34-condition-builder.md) — planned
- [FE-35 · JSON explorer](../features/FE-35-json-explorer.md) — planned

## Code
_None yet._

## Tests
_None yet._

## Changelog
- 2026-10-18 — context file created.
