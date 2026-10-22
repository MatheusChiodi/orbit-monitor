import i18next, { type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type en from './locales/en.json';
import type themeEn from '@/shared/theme/locales/en.json';
import type historyRangeEn from '@/domains/telemetry/history/locales/en.json';

export const SUPPORTED_LOCALES = ['en', 'pt-BR'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'orbit.locale';

/** Theme and history-range messages live with their features (`@/shared/theme`, `@/domains/telemetry/history`). */
export type Messages = typeof en & { theme: typeof themeEn; historyRange: typeof historyRangeEn };

/**
 * Locales are separate chunks: an entry point awaits `loadLocale` for its language before rendering,
 * and `setLocale` loads a new language before switching, so a wall downloads one language only.
 */
const LOADERS: Record<Locale, () => Promise<Messages>> = {
  en: async () => {
    const [base, theme, historyRange] = await Promise.all([
      import('./locales/en.json'),
      import('@/shared/theme/locales/en.json'),
      import('@/domains/telemetry/history/locales/en.json'),
    ]);
    return { ...base.default, theme: theme.default, historyRange: historyRange.default };
  },
  'pt-BR': async () => {
    const [base, theme, historyRange] = await Promise.all([
      import('./locales/pt-BR.json'),
      import('@/shared/theme/locales/pt-BR.json'),
      import('@/domains/telemetry/history/locales/pt-BR.json'),
    ]);
    return { ...base.default, theme: theme.default, historyRange: historyRange.default };
  },
};

const RESOURCES: Partial<Record<Locale, Messages>> = {};

export function loadLocaleMessages(locale: Locale): Promise<Messages> {
  return LOADERS[locale]();
}

export function isLocaleLoaded(locale: Locale): boolean {
  return RESOURCES[locale] !== undefined;
}

export async function loadLocale(locale: Locale): Promise<void> {
  RESOURCES[locale] ??= await loadLocaleMessages(locale);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Maps a BCP 47 tag such as `pt-PT` or `en-GB` to a supported locale. */
function matchLanguage(tag: string): Locale | null {
  if (isLocale(tag)) return tag;
  const base = tag.toLowerCase().split('-')[0];
  if (base === 'pt') return 'pt-BR';
  if (base === 'en') return 'en';
  return null;
}

export interface LocaleSources {
  search: string;
  saved: string | null;
  languages: readonly string[];
}

/** Resolution order: `?lang=` → saved on the device → `navigator.languages` → `en`. */
export function resolveLocale({ search, saved, languages }: LocaleSources): Locale {
  const fromQuery = new URLSearchParams(search).get('lang');
  if (isLocale(fromQuery)) return fromQuery;
  if (isLocale(saved)) return saved;
  for (const tag of languages) {
    const match = matchLanguage(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function loadSavedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // storage blocked: the choice lasts only for this page
  }
}

/** Raw resource for pure code (formatters) that cannot use hooks. */
export function messages(locale: Locale): Messages {
  const resource = RESOURCES[locale] ?? RESOURCES[DEFAULT_LOCALE] ?? Object.values(RESOURCES)[0];
  if (!resource) throw new Error('No locale loaded: await loadLocale() before rendering');
  return resource;
}

export interface CreateI18nOptions {
  /** Registers the instance as the react-i18next default (used when no provider is mounted). */
  global?: boolean;
}

export function createI18n(locale: Locale, options: CreateI18nOptions = {}): I18n {
  const instance = i18next.createInstance();
  if (options.global) instance.use(initReactI18next);
  void instance.init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    resources: Object.fromEntries(Object.entries(RESOURCES).map(([lng, translation]) => [lng, { translation }])),
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}

export function currentLocale(instance: I18n): Locale {
  return isLocale(instance.language) ? instance.language : DEFAULT_LOCALE;
}

export async function setLocale(instance: I18n, locale: Locale): Promise<void> {
  await loadLocale(locale);
  if (!instance.hasResourceBundle(locale, 'translation')) instance.addResourceBundle(locale, 'translation', RESOURCES[locale]);
  await instance.changeLanguage(locale);
  saveLocale(locale);
  document.documentElement.lang = locale;
}

/** Locale for an entrypoint at startup. */
export function detectLocale(): Locale {
  return resolveLocale({
    search: window.location.search,
    saved: loadSavedLocale(),
    languages: navigator.languages ?? [navigator.language],
  });
}
