---
id: BE-40
title: "Workspace defaults and themes API"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-40 · Workspace defaults and themes API

## Summary
Default theme, animation level, density, locale and scale; custom themes with server-side contrast validation

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/theme/ThemeService.java`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/theme/ThemeStore.java`
- `backend/orbit-security/src/main/java/io/orbit/security/settings/WorkspaceDefaults.java`
- `backend/orbit-security/src/main/java/io/orbit/security/settings/OrbitSettings.java`
- `backend/orbit-security/src/main/java/io/orbit/security/settings/SettingsService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ThemeController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/SettingsController.java`
- `backend/config-examples/orbit.themes.example.json`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/theme/ThemeServiceTest.java`
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/theme/ThemeStoreTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/settings/WorkspaceDefaultsTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/WorkspaceConfigApiTest.java` (themes, defaults)

## API
| Method | Path | Body / response |
|---|---|---|
| GET | `/api/themes` | `{ version: 1, items: CustomTheme[] }` (anyone) |
| GET | `/api/themes/{id}` | `CustomTheme` |
| POST | `/api/themes` | `CustomTheme` → 201; 409 when the id exists |
| PUT | `/api/themes/{id}` | `CustomTheme` (id from the path) |
| DELETE | `/api/themes/{id}` | 204 |
| GET | `/api/settings/defaults` | `{ theme, animation, density, locale, scale }` effective values (anyone) |
| PUT | `/api/settings/defaults` | same shape; null fields go back to the built-in value (editors) |

`CustomTheme` = the frontend `OrbitTheme`: `{ id, name, mode: dark|light, category, colors: {bg,s1,s2,s3,line,line2,text,muted,dim,ok,warn,down,info,accent}, chart: [8 hex], syntax: {keyword,string,number,comment,function,operator,identifier}, fx: {from,to,glow}, basedOn?, updatedAt, updatedBy }`. Category is always stored as `custom`; unknown tokens are dropped. Invalid themes → 422 `invalid-config` with `errors` such as `text on bg: contrast 1.10:1 is below 4.5:1`. Mutations need an editor (403 otherwise) and `X-Orbit-Operator`; audited as `theme.*` and `settings.defaults`.

## Decisions and notes
- WCAG contrast computed server-side before a custom theme is saved in orbit.themes.json; defaults live in orbit.settings.json.
- `ThemeStore` mirrors the frontend FE-02 rules exactly: `text` on bg/s1/s2/s3 and `muted` on bg/s1/s2 at 4.5:1; `dim` and `accent` on bg/s1, `ok/warn/down/info` on bg/s1/s2 at 3:1 (WCAG 2.x relative luminance, sRGB linearization with the 0.04045 threshold; `#rgb` expanded, alpha ignored like the frontend). Ids follow the frontend `THEME_ID_PATTERN`; colors must be `#rgb`, `#rrggbb` or `#rrggbbaa` (nothing CSS could read as a URL). The same validator runs when the file is loaded, so a hand-edited unreadable theme is reported and not served.
- The legacy `ThemeService.validate(Theme)` (CSS-variable tokens) stays as the lower-level check; `ThemeService.builtInDefaults()` now returns `WorkspaceDefaults.BUILT_IN`.
- Defaults use the frontend `WorkspacePreferenceDefaults` names and values so the response can be passed to `setWorkspaceDefaults` as is: theme id, animation `off|minimal|standard|expressive`, density `compact|comfortable|spacious`, locale `en|pt-BR`, scale `2m|3m|5m` (FE-08 viewing distance). Built-in: `orbit-dark`, `standard`, `comfortable`, `en`, `3m` (the old `dark/full/1.0` did not match the frontend; the test assertion was aligned). Stored in `orbit.settings.json` as `theme`, `animationLevel`, `density`, `locale`, `scale`; saving defaults keeps the access section.
- Alternatives: a Spring `@Validated` bean-validation layer was not used because the same rules must run on file load (outside HTTP); a color library was not needed for luminance.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — WCAG contrast validation and built-in defaults implemented; ThemeServiceTest un-pended (API pending).
- 2026-10-22 — /api/themes CRUD over orbit.themes.json with FE-02 contrast rules on the server; /api/settings/defaults (theme, animation, density, locale, scale) in orbit.settings.json (status: done).
