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
- `backend/orbit-api/src/main/resources/messages.properties`
- `backend/orbit-api/src/main/resources/messages_pt_BR.properties`
- `backend/orbit-api/src/main/java/io/orbit/api/config/I18nConfig.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/Messages.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ProblemHandler.java`
- `backend/orbit-common/src/main/java/io/orbit/common/i18n/Localizable.java`

## Tests
- `frontend/src/shared/i18n/i18n.test.ts`
- `frontend/src/shared/i18n/message.test.ts`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.test.tsx`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ProblemI18nTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/MessageBundlesTest.java`

## Decisions and notes
- Frontend: Locale order: `?lang=` → `localStorage` (`orbit.locale`) → `navigator.languages` (`pt-*` → `pt-BR`) → `en`.
- Frontend: All UI text lives in the two locale files (parity test); pure code returns `Message` descriptors.
- Frontend: Every screen and component test covers both languages.
- Backend: `Accept-Language` picks en (default) or pt-BR (`AcceptHeaderLocaleResolver`); any other language falls back to English; `spring.messages.fallback-to-system-locale=false` so the OS language never leaks in.
- Backend: Problem Details keep the stable English `code`; `title` and `detail` come from `messages*.properties`. Domain errors (`UnsafeSqlException`, `ConditionSyntaxException`, `SsrfBlockedException`) implement `Localizable` (key + args) and keep an English message as fallback.
- Backend: `MessageBundlesTest` fails when a key exists in one language only.
- Backend: Pending: config validation error lists, wall timeline titles and notification texts.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — frontend: i18next infrastructure, en/pt-BR locale files, typed keys and language selector (status: in-progress).
- 2026-10-18 — frontend: every screen and component now translated; language selector in the console header.
- 2026-10-18 — backend: API errors translated en/pt-BR via MessageSource and Accept-Language.
