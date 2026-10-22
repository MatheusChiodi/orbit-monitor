---
screen: monitor-editor-http
title: "HTTP monitor editor"
route: "index.html#/monitors/new/http"
status: in-progress
spec: docs/02-features.md §2.1
updated: 2026-10-22
---

# HTTP monitor editor

## Purpose
Request config left, live preview right (status, time, headers, body), conditions.

## Layout and components
`NewMonitorScreen` (`#/monitors/new/http`, also `/http-steps`, `/tcp`, `/ping`, `/push`, `/dns`, `/cert`, `/grpc`, `/kafka`) → `MonitorForm`: HTTP fields + `OAuthFields` (write-only secret), `HttpStepsFields`, `CheckTargetFields`; HTTP preview with the JSON explorer in Data & display; a created push monitor shows its URL once.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-01 · Gatus-style conditions](../features/CORE-01-gatus-style-conditions.md) — done
- [CORE-04 · HTTP probe with SSRF protection](../features/CORE-04-http-probe-with-ssrf-protection.md) — in-progress
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — in-progress
- [CORE-16 · Sensitive data protection (LGPD / PCI DSS)](../features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) — done
- [FE-34 · Condition builder](../features/FE-34-condition-builder.md) — done
- [FE-35 · JSON explorer](../features/FE-35-json-explorer.md) — done

## Code
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.tsx`
- `frontend/src/domains/monitor/form/form.ts`
- `frontend/src/domains/monitor/components/OAuthFields/OAuthFields.tsx`
- `frontend/src/domains/monitor/components/HttpStepsFields/HttpStepsFields.tsx`
- `frontend/src/domains/monitor/components/CheckTargetFields/CheckTargetFields.tsx`
- `frontend/src/domains/monitor/form/targets.ts`

## Tests
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.test.tsx`
- `frontend/src/domains/monitor/form/targets.test.ts`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.kinds.test.tsx`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — HTTP variant of the monitor form; en/pt-BR.
- 2026-10-22 — every monitor kind, OAuth2, HTTP steps and the one-time push URL.
