---
id: CORE-15
title: "Internationalization (en / pt-BR)"
area: full-stack
group: "Platform"
status: in-progress
screens: [preferences, wall, settings]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-15 · Internationalization (en / pt-BR)

## Summary
English default, pt-BR available; i18next on the front, MessageSource + Accept-Language on the back; Intl formatting.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [wall](../screens/wall.md), [settings](../screens/settings.md)

## Code
- `frontend/src/shared/i18n/i18n.ts` — instance factory, locale resolution and persistence
- `frontend/src/shared/i18n/locales/en.json`, `frontend/src/shared/i18n/locales/pt-BR.json`
- `frontend/src/shared/i18n/i18next.d.ts` — typed keys
- `frontend/src/shared/i18n/message.ts` — `Message` descriptors for pure code
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.tsx`
- `frontend/src/shared/i18n/useLocale.ts`

## Tests
- `frontend/src/shared/i18n/i18n.test.ts`
- `frontend/src/shared/i18n/message.test.ts`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.test.tsx`

## Decisions and notes
- Frontend: locale order is `?lang=` → `localStorage` (`orbit.locale`, try/catch) → `navigator.languages` (`pt-*` → `pt-BR`) → `en`.
- Frontend: all UI text lives in the two locale files; a parity test fails if their keys differ.
- Frontend: pure functions return `Message` (`{ key, params }`) and components translate them, so domain code stays language-neutral.
- Frontend: formatters take the locale explicitly and read time phrases ("12 min ago" / "há 12 min") from the locale files.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — frontend: i18next infrastructure, en/pt-BR locale files, typed keys and language selector (status: in-progress).
