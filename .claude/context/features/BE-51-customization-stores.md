---
id: BE-51
title: "Customization and terminology stores"
area: backend
group: "Customization"
status: done
screens: [settings]
spec: docs/07-customization.md
updated: 2026-10-22
---

# BE-51 · Customization and terminology stores

## Summary
orbit.customization.json and orbit.terminology.json with JSON Schema, scopes, profiles and REST APIs; secrets never included in exports.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/customization/CustomizationService.java`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/customization/TerminologyService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/CustomizationController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/TerminologyController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/WorkspaceBeans.java`
- `backend/orbit-config/src/main/resources/schemas/orbit.customization.schema.json`
- `backend/orbit-config/src/main/resources/schemas/orbit.terminology.schema.json`
- `backend/config-examples/orbit.customization.example.json`
- `backend/config-examples/orbit.terminology.example.json`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/customization/CustomizationServiceTest.java`
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/customization/TerminologyServiceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/CustomizationApiTest.java`

## JSON files
`orbit.customization.json` — one item per server-side scope (device values stay in the browser):
```json
{ "version": 1, "items": [
  { "id": "workspace", "scope": "workspace", "values": { "card.monitor.clickAction": "expand" }, "updatedAt": "…", "updatedBy": "Ana" },
  { "id": "layout:noc", "scope": "layout", "target": "noc", "values": { "card.monitor.variant": "compact" } },
  { "id": "instance:card-sel_queue", "scope": "instance", "target": "card-sel_queue", "values": { … } },
  { "id": "profile:night-shift", "scope": "profile", "target": "night-shift", "name": "Night shift", "values": { "wall.dim": true } }
] }
```
`orbit.terminology.json` — one item per locale: `{ "id": "pt-BR", "terms": { "status.DOWN": "Fora do ar" }, "updatedAt", "updatedBy" }`.

## API
| Method | Path | Body / response |
|---|---|---|
| GET | `/api/customization` | `{ version: 1, items: Entry[] }` (anyone) |
| GET | `/api/customization/resolve?layout=&instance=` | `{ layout, instance, values }` merged workspace < layout < instance |
| GET / PUT / DELETE | `/api/customization/workspace` | `Entry` / body `{ values }` / 204 reset |
| GET / PUT / DELETE | `/api/customization/{scope}/{target}` | scope `layout`, `instance` or `profile`; body `{ name?, values }` (name required for profiles) |
| GET | `/api/customization/profiles/{id}/export` | `{ format: "orbit.customization-profile", version: 1, name, values }` as an attachment |
| POST | `/api/customization/profiles/{id}/import` | that file → `Entry` saved as `profile:{id}` |
| GET | `/api/terminology` | `{ version: 1, items: Terms[] }` |
| GET | `/api/terminology/{locale}` | `{ locale, terms }` (empty map when none) |
| PUT | `/api/terminology/{locale}` | `{ terms: { key: text } }` → `Terms` (replaces the locale) |
| DELETE | `/api/terminology/{locale}` | 204 reset |

`Entry = { id, scope, target, name, values: { settingId: JSON }, updatedAt, updatedBy }`. Reads are open (the wall needs layout/instance values); mutations need an editor and `X-Orbit-Operator`; audited as `customization.save|reset|import` and `terminology.save|reset` (counts only, never values). Invalid input → 422 `invalid-config` with `errors`; unknown locale on GET → 400.

## Decisions and notes
- The backend stores values as plain JSON per setting id; the meaning, types and defaults belong to the frontend registry (CORE-21), which applies device and `prefers-reduced-motion` above these scopes.
- Safety guarantees (docs/07 §7) cannot be stored: setting ids under `privacy.`, `access.`, `security.`, `guard(s).`, `sql.guard`, `http.guard`, `vault.` and `motion.reducedMotion` are refused. Values cannot hold secrets: `{"enc": …}`, `${env:…}` or `${vault:…}` are refused, and `ConfigFile` refuses card numbers — so exports (BE-37 archive and profile files) never carry secrets.
- Limits: setting ids `[a-zA-Z][a-zA-Z0-9]*(.segment){0,8}` up to 100 characters, 500 settings per scope, 4096 characters per value; targets `[A-Za-z0-9][A-Za-z0-9_.-]{0,99}`; profile names up to 60.
- Terminology: locales `en` and `pt-BR`; keys `[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}`; texts 1–120 characters, plain text only (`<`, `>` and control characters refused) since labels end up in the UI; at most 2000 terms per locale.
- Ids encode the scope (`layout:noc`) so one file holds every scope and a scope is replaced atomically. Built-in profiles stay in the frontend; only custom ones are stored.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-22 — orbit.customization.json (workspace/layout/instance/profile scopes, resolve, profile export/import) and orbit.terminology.json stores with schemas, examples and REST APIs (status: done).
