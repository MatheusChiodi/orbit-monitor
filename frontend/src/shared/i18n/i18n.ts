import i18next, { type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';
import themeEn from '@/shared/theme/locales/en.json';
import themePtBR from '@/shared/theme/locales/pt-BR.json';
import historyRangeEn from '@/domains/telemetry/history/locales/en.json';
import historyRangePtBR from '@/domains/telemetry/history/locales/pt-BR.json';

export const SUPPORTED_LOCALES = ['en', 'pt-BR'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'orbit.locale';

/** Theme and history-range messages live with their features (`@/shared/theme`, `@/domains/telemetry/history`). */
export type Messages = typeof en & { theme: typeof themeEn; historyRange: typeof historyRangeEn };

const RESOURCES: Record<Locale, Messages> = {
  en: { ...en, theme: themeEn, historyRange: historyRangeEn },
  'pt-BR': { ...ptBR, theme: themePtBR, historyRange: historyRangePtBR },
};

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
  return RESOURCES[locale];
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
    resources: { en: { translation: RESOURCES.en }, 'pt-BR': { translation: RESOURCES['pt-BR'] } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}

export function currentLocale(instance: I18n): Locale {
  return isLocale(instance.language) ? instance.language : DEFAULT_LOCALE;
}

export async function setLocale(instance: I18n, locale: Locale): Promise<void> {
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
