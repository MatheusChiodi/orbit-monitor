---
id: FE-54
title: "Terminology editor"
area: frontend
group: "Customization"
status: done
screens: [settings]
spec: docs/07-customization.md
updated: 2026-10-22
---

# FE-54 · Terminology editor

## Summary
Rename any UI label per language (en/pt-BR) with search and reset; stored in orbit.terminology.json.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/shared/customization/terminology.ts`
- `frontend/src/shared/customization/useTerminology.ts`
- `frontend/src/shared/customization/api.ts (`loadTerminology`, `saveTerminology`)`
- `frontend/src/domains/customization/TerminologyEditor/TerminologyEditor.tsx`
- `frontend/src/domains/customization/CustomizationScreen/CustomizationScreen.tsx (Names tab)`

## Tests
- `frontend/src/shared/customization/terminology.test.ts`
- `frontend/src/domains/customization/TerminologyEditor/TerminologyEditor.test.tsx`
- `frontend/src/app/console/ConsoleApp.customization.test.tsx`

## Decisions and notes
- Overrides are applied to the live i18next instance with `addResourceBundle` (deep, overwrite); keys removed since the last call get their original text back, and unmounting restores every original. `react.bindI18nStore: "added"` makes components re-render.
- Only labels that exist in the product catalog can be renamed; values are trimmed, 1–120 characters, plain text (control characters removed, `<` and `>` refused, as BE-51 does). Empty labels are refused so a state always keeps a text label (docs/07 §7). React escapes the text; nothing is rendered as HTML.
- Editor: language selector (en / pt-BR), search over key, original and renamed text, "Renamed only" filter, reset per label and per language, save per language to `orbit.terminology.json`; first 200 matches shown. Read-only for view-only clients.
- Names of monitors, groups, fields and layouts are edited where they are registered (their own config files), not here.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-22 — terminology editor with search, per-language rename, reset and save; live label overrides in console and wall (status: done).
