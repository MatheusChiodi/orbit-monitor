---
id: FE-66
title: "Guided monitor flow"
area: frontend
group: "Console redesign"
status: done
screens: [monitor-editor-http, monitor-editor-sql]
spec: docs/02-features.md §2
updated: 2026-10-24
---

# FE-66 · Guided monitor flow

## Summary
Adding a monitor works on a fresh install: choose Website/API or Database query (other kinds behind a disclosure, or a template), then Target → Data → Conditions → Review with Save always in the sticky action bar; groups can be created inline and a "Default" group is created on the first save.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md), [monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `frontend/src/app/console/screens/NewMonitorScreen/NewMonitorScreen.tsx`, `useMonitorFormServices.ts`, `withKept.ts`
- `frontend/src/domains/monitor/components/KindChooser/KindChooser.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.tsx`, `steps.ts`, `DataStep.tsx`, `reviewItems.tsx`, `TargetFields.tsx`
- `frontend/src/domains/monitor/components/{FormStepper,TargetStep,PreviewPanel,ReviewStep,GroupSelect}/`
- `frontend/src/domains/monitor/components/{ConditionEditor,ConditionBuilder,DataDisplayStep,SqlCodeEditor,JsonExplorer,TemplatePicker}/`
- `frontend/src/domains/monitor/conditions/alertRules.ts`, `conditions.ts`, `conditionText.ts`
- `frontend/src/domains/monitor/display/display.ts` (`dedupeFields`, `systemFieldKey`, `mergeSuggested`)

## Tests
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.test.tsx`, `MonitorForm.kinds.test.tsx`, `MonitorForm.motion.test.tsx`, `TargetFields.test.tsx`
- `frontend/src/domains/monitor/components/KindChooser/KindChooser.test.tsx`, `GroupSelect/GroupSelect.test.tsx`
- `frontend/src/domains/monitor/components/ConditionEditor/*.test.tsx`, `ConditionBuilder/ConditionBuilder.test.tsx`, `DataDisplayStep/*.test.tsx`
- `frontend/src/domains/monitor/conditions/alertRules.test.ts`, `conditions.test.ts`; `display/display.test.ts`
- `frontend/src/app/console/screens/EditMonitorScreen/EditMonitorScreen.test.tsx` (also covers NewMonitorScreen)

## Decisions and notes
- Rules read as alerts ("Down when Response time is above 1000 ms") while the server keeps the healthy assertion (`[RESPONSE_TIME] <= 1000`); each alert comparison maps to its inverse (`alertRules.ts`). Comparisons are filtered by value type (number/duration, text, boolean, date).
- Defaults: HTTP and HTTP steps get `[STATUS] between 200 and 299 → DOWN` and `[RESPONSE_TIME] <= 1000 → WARN`; TCP and ping get the response-time warning; new rules default to Down.
- The wall/list "rule" comes from the first numeric comparison that is not on `[STATUS]` (`PrimaryValue`), so the response-time default fills it; checked against the server, no reader change needed.
- Fixed contract mismatches with the server: ranges are sent as `min and max` (was `min..max`), lists in parentheses, and dates use `newer than`/`older than` with server semantics (the old "newer than" option sent `older than`, inverted).
- The HTTP preview already returns `[STATUS]`/`[RESPONSE_TIME]` as columns; fields are deduped by key (fixes the duplicate React key) and keep friendly names ("HTTP status", "Response time").
- Data rows: keep, friendly name, value now (`SafeValue`), "Show as"; format, unit, history chart, masking and wall visibility sit behind "Formatting".
- The preview has a reserved height and scrolls inside; Data is its own step, so running a preview no longer pushes the page.
- Fresh install: with no groups the select shows "Default (created when you save)"; the form creates the group (`PUT /api/groups/default`) right before saving. With one group it is preselected.
- Duplicate: `#/monitors/new?from=<id>` loads the monitor, drops id, pause and masked secrets (must be retyped), names it "Copy of …".

## Changelog
- 2026-10-24 — guided flow, inline groups, defaults per kind, alert-style rules, simplified Data step (status: done).
