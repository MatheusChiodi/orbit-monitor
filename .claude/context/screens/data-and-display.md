---
screen: data-and-display
title: "Data & display step"
route: "index.html#/monitors/:id/display"
status: planned
spec: docs/02-features.md §2.3
updated: 2026-10-18
---

# Data & display step

## Purpose
Pick fields to store, label/format/unit, series or not, display mode via visualization picker, privacy badges.

## Layout and components
_To be filled as the screen is built (component tree, file paths)._

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-03 · SQL probe and result payload](../features/CORE-03-sql-probe-and-result-payload.md) — planned
- [CORE-10 · Data & display step](../features/CORE-10-data-display-step.md) — planned
- [CORE-12 · Value formatting](../features/CORE-12-value-formatting.md) — in-progress
- [CORE-16 · Sensitive data protection (LGPD / PCI DSS)](../features/CORE-16-sensitive-data-protection-lgpd-pci-dss.md) — planned
- [FE-14 · Reorder fields and columns](../features/FE-14-reorder-fields-and-columns.md) — planned
- [FE-21 · Visualization picker](../features/FE-21-visualization-picker.md) — planned
- [FE-22 · Compatibility rules](../features/FE-22-compatibility-rules.md) — planned
- [FE-23 · Visualization settings](../features/FE-23-visualization-settings.md) — planned
- [FE-24 · 20 display modes](../features/FE-24-20-display-modes.md) — planned
- [FE-25 · Week-over-week overlay](../features/FE-25-week-over-week-overlay.md) — planned
- [FE-26 · Chart annotations](../features/FE-26-chart-annotations.md) — planned
- [FE-27 · Zoom and synced crosshair](../features/FE-27-zoom-and-synced-crosshair.md) — planned

## Code
_None yet._

## Tests
_None yet._

## Changelog
- 2026-10-18 — context file created.
