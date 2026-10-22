---
id: CORE-21
title: "Customization registry"
area: full-stack
group: "Customization"
status: done
screens: [settings]
spec: docs/07-customization.md
updated: 2026-10-22
---

# CORE-21 · Customization registry

## Summary
Registry of every customizable setting with schema, useSetting(id, {instanceId}), scopes instance > layout > device > workspace > default, generated Settings UI with search and JSON view.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/shared/customization/types.ts`
- `frontend/src/shared/customization/define.ts`
- `frontend/src/shared/customization/validate.ts`
- `frontend/src/shared/customization/registry.ts`
- `frontend/src/shared/customization/definitions/appearance.ts`
- `frontend/src/shared/customization/definitions/cards.ts`
- `frontend/src/shared/customization/resolve.ts`
- `frontend/src/shared/customization/store.ts`
- `frontend/src/shared/customization/api.ts (BE-51 client)`
- `frontend/src/shared/customization/CustomizationProvider.tsx`
- `frontend/src/shared/customization/useSetting.ts`
- `frontend/src/shared/customization/labels.ts`
- `frontend/src/shared/customization/locales/en.json`
- `frontend/src/shared/customization/locales/pt-BR.json`
- `frontend/src/domains/customization/SettingsEditor/SettingsEditor.tsx`
- `frontend/src/domains/customization/SettingField/SettingField.tsx`
- `frontend/src/domains/customization/JsonSettingsView/JsonSettingsView.tsx`
- `frontend/src/domains/customization/CustomizationScreen/CustomizationScreen.tsx`
- `frontend/src/domains/customization/CustomizationRuntime/CustomizationRuntime.tsx`
- `frontend/src/domains/customization/WallCustomization/WallCustomization.tsx`
- `frontend/src/app/console/ConsoleApp.tsx (header button, `#/settings/customization`, providers)`
- `frontend/src/app/console-main.tsx`
- `frontend/src/app/wall-main.tsx`
- `frontend/src/shared/i18n/i18n.ts (customization namespace, `bindI18nStore: added`)`

## Tests
- `frontend/src/shared/customization/registry.test.ts`
- `frontend/src/shared/customization/resolve.test.ts`
- `frontend/src/shared/customization/store.test.ts`
- `frontend/src/shared/customization/api.test.ts`
- `frontend/src/shared/customization/useSetting.test.tsx`
- `frontend/src/domains/customization/SettingsEditor/SettingsEditor.test.tsx`
- `frontend/src/domains/customization/WallCustomization/WallCustomization.test.tsx`
- `frontend/src/app/console/ConsoleApp.customization.test.tsx`

## Decisions and notes
- Research: compared a schema library (Zod / Valibot) against a hand-written typed registry modelled on VS Code `contributes.configuration` (one schema drives the JSON view, validation and the generated Settings UI; https://code.visualstudio.com/api/references/contribution-points, https://code.visualstudio.com/docs/configure/settings). Chose the hand-written registry: no new dependency in the wall bundle, same pattern as the FE-50 per-key validators, and the closed set of setting types (boolean, enum, action, font, number, color, text, list, object) is small enough to validate exhaustively with TypeScript narrowing.
- `defineSetting` fails at load time for a malformed id, no scope or a default outside its own schema. Numbers are clamped and snapped to the step, lists keep `required` items (state + name on cards), text is trimmed with control characters removed, colors accept theme tokens or `#rrggbb` only.
- Precedence (docs/07 §3): Customize-mode preview > instance > layout > device > workspace > default. A value stored at a scope the setting does not allow, or that fails validation, is ignored. `prefers-reduced-motion` stays above everything through `AnimationLevelProvider`.
- Safety (docs/07 §7): the registry has no setting for masking, PAN, secrets, SQL/HTTP guards, timeouts, contrast or reduced motion; a test fails if such an id is ever registered. View-only clients see the Settings UI disabled and never get Customize mode.
- FE-50 bridge: `density.level` and `motion.level` keep their device value in the preferences store (`orbit.preferences`); their default comes from the workspace preferences (`orbit.settings.json`). Other device values live in `localStorage` `orbit.customization.device` (sanitized on load).
- `useSetting(id, { instanceId })` reads one value; without a provider it returns the product default, so components and existing tests work unchanged. `useMonitorCardSettings` / `useGroupCardSettings` resolve a whole card at once.
- BE-51 client (`shared/customization/api.ts`) follows the merged contract: `GET /api/customization` items `{ id, scope: workspace|layout|instance|profile, target, name, values }`; `PUT` `{ values }` / `DELETE` on `/api/customization/workspace` and `/api/customization/{scope}/{target}`; profiles `PUT /api/customization/profile/{slug}` `{ name, values }`; `GET /api/terminology` items `{ id: <locale>, terms }`, `PUT /api/terminology/{locale}` `{ terms }`; `GET /api/layouts` (BE-41) for the layout slugs the wall uses (`/wall/<slug>`). Instance ids are `<type>:<id>` in the frontend and stored as target `<type>.<id>` (BE-51 targets allow no colon). 404 = empty file; 403 = view-only (translated error, change reverted). The device scope never leaves the browser.
- Wall: `WallCustomization` reads workspace, layout (`/wall/<slug>`) and device values and applies the look; editor code (inspector, settings fields, terminology editor) is a lazy chunk loaded only when `/api/access` grants edit.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-22 — registry, scopes and precedence, `useSetting`, generated Settings UI with search, categories, modified filter, resets and JSON view, BE-51 API client, console and wall wiring (status: done).
- 2026-10-22 — API client aligned to the merged BE-51 endpoints (values/terms bodies, scope paths, instance target encoding, profile file format) and BE-41 layout slugs.
