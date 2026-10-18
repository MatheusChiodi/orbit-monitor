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
- `frontend/src/shared/i18n/i18n.ts`
- `frontend/src/shared/i18n/locales/en.json`
- `frontend/src/shared/i18n/locales/pt-BR.json`
- `frontend/src/shared/i18n/i18next.d.ts`
- `frontend/src/shared/i18n/message.ts`
- `frontend/src/shared/i18n/useLocale.ts`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.tsx`
- `frontend/src/test/renderWithLocale.tsx`

## Tests
- `frontend/src/shared/i18n/i18n.test.ts`
- `frontend/src/shared/i18n/message.test.ts`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.test.tsx`

## Decisions and notes
- Frontend: Locale order: `?lang=` → `localStorage` (`orbit.locale`) → `navigator.languages` (`pt-*` → `pt-BR`) → `en`.
- Frontend: All UI text lives in the two locale files (parity test); pure code returns `Message` descriptors.
- Frontend: Every screen and component test covers both languages.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — frontend: i18next infrastructure, en/pt-BR locale files, typed keys and language selector (status: in-progress).
- 2026-10-18 — frontend: every screen and component now translated; language selector in the console header.
