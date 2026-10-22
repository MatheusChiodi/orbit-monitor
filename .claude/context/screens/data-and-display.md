---
screen: data-and-display
title: "Data & display step"
route: "index.html#/monitors/:id/display"
status: done
spec: docs/02-features.md §2.3
updated: 2026-10-22
---

# Data & display step

## Purpose
Pick fields to store, label/format/unit, series or not, display mode via visualization picker, privacy badges.

## Layout and components
- `PreviewTable` (detected column types, read-mode suggestion) + `DataDisplayStep` (store, label, format, unit, series, display per field)

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-03 · SQL probe and result payload](../features/CORE-03-sql-probe-and-result-payload.md) — in-progress
- [CORE-10 · Data & display step](../features/CORE-10-data-display-step.md) — done
- [CORE-12 · Value formatting](../features/CORE-12-value-formatting.md) — done
- [CORE-16 · Sensitive data protection (LGPD / PCI DSS)](../features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) — in-progress
- [FE-14 · Reorder fields and columns](../features/FE-14-reorder-fields-and-columns.md) — done
- [FE-21 · Visualization picker](../features/FE-21-visualization-picker.md) — done
- [FE-22 · Compatibility rules](../features/FE-22-compatibility-rules.md) — done
- [FE-23 · Visualization settings](../features/FE-23-visualization-settings.md) — done
- [FE-24 · 20 display modes](../features/FE-24-20-display-modes.md) — done
- [FE-25 · Week-over-week overlay](../features/FE-25-week-over-week-overlay.md) — done
- [FE-26 · Chart annotations](../features/FE-26-chart-annotations.md) — done
- [FE-27 · Zoom and synced crosshair](../features/FE-27-zoom-and-synced-crosshair.md) — done

## Code
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.tsx`
- `frontend/src/domains/monitor/display/display.ts`
- `frontend/src/domains/monitor/components/JsonExplorer/JsonExplorer.tsx`

## Tests
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.test.tsx`
- `frontend/src/domains/monitor/display/display.test.ts`
- `frontend/src/domains/monitor/display/display.pick.test.ts`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — first version inside the monitor form; privacy badges pending (CORE-16).
- 2026-10-22 — JSON explorer integrated for HTTP previews (status: done).
