---
id: CORE-10
title: "Data & display step"
area: frontend
group: "Monitor"
status: done
screens: [data-and-display]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-10 · Data & display step

## Summary
Field selection, label, format, unit, series flag, display mode, where it appears.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md)

## Code
- `frontend/src/domains/monitor/display/display.ts`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.tsx`
- `frontend/src/domains/monitor/form/targets.ts`
- `frontend/src/domains/monitor/components/CheckTargetFields/CheckTargetFields.tsx`
- `frontend/src/domains/monitor/components/HttpStepsFields/HttpStepsFields.tsx`
- `frontend/src/domains/monitor/components/OAuthFields/OAuthFields.tsx`
- `frontend/src/shared/api/monitorTargets.ts`

## Tests
- `frontend/src/domains/monitor/display/display.test.ts`
- `frontend/src/domains/monitor/display/display.privacy.test.ts`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.test.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.privacy.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.privacy.test.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.reorder.test.tsx`
- `frontend/src/domains/monitor/display/display.pick.test.ts`
- `frontend/src/domains/monitor/form/targets.test.ts`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.kinds.test.tsx`

## Decisions and notes
- Read mode suggested from the preview shape (single value, indicator card, ranking, time series, table, row count).
- Each field: store checkbox, label, format, unit, store as series, display mode, masked and show-on-wall; unchecked fields are not stored.
- Privacy badges and rules from CORE-16 apply to preview columns and to fields picked in the JSON explorer (FE-35); field reordering (FE-14) is in place.
- The form now covers every monitor kind: SQL, HTTP (+ optional OAuth2 client credentials, BE-08), HTTP steps (BE-07: name, method, URL, headers, body, `var = $.path` extraction), TCP, ping, push (one-time push URL shown after creation), DNS (record type, expected answer), certificate (host, port 443), gRPC health (service, TLS) and Kafka lag (bootstrap servers, group, topic). Only SQL/HTTP have a live preview; the others explain it and use probe placeholders in conditions.
- Verified against the runtime API (developer 3d778a7): checks send `host`, `port`, `maxSilenceSeconds` and a `probe` block (DNS `recordType/expected`, gRPC `service/tls`, Kafka `bootstrapServers/consumerGroup/topic`, CERT `domain` = host); HTTP steps are saved as an HTTP request whose last step is the main request and earlier ones go in `steps`; OAuth2 travels as `oauth {tokenUrl, clientId, clientSecret?, scope?}`. SQL previews send `intervalSeconds` and show the BE-14 cost warning with a "Use N s" action.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — suggestion rules, preview table and field list in en/pt-BR (status: in-progress).
- 2026-10-18 — privacy badges, masked and show-on-wall controls (status: in-progress).
- 2026-10-22 — Data & display complete (JSON explorer, field reordering) and the form covers every monitor kind (status: done).
- 2026-10-22 — aligned to the runtime MonitorRequest (probe, steps, oauth) and BE-14 cost warning.
