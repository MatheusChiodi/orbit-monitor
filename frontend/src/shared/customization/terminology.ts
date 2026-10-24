import type { i18n as I18n } from 'i18next';
import { createStore } from 'zustand/vanilla';
import { SUPPORTED_LOCALES, messages, type Locale } from '@/shared/i18n/i18n';
import type { Message } from '@/shared/i18n/message';
import { errorMessage, sanitizeLabels, type CustomizationApi, type Terminology } from './api';

/** FE-54: one renamable label of the product catalog. */
export interface CatalogEntry {
  key: string;
  text: string;
}

const catalogs = new Map<Locale, CatalogEntry[]>();

function flatten(node: unknown, prefix: string, out: CatalogEntry[]): void {
  if (typeof node === 'string') out.push({ key: prefix, text: node });
  else if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
}

export function catalogEntries(locale: Locale): CatalogEntry[] {
  let entries = catalogs.get(locale);
  if (!entries) {
    entries = [];
    flatten(messages(locale), '', entries);
    catalogs.set(locale, entries);
  }
  return entries;
}

function originalText(locale: Locale, key: string): string | undefined {
  return catalogEntries(locale).find((e) => e.key === key)?.text;
}

export function emptyTerminology(): Terminology {
  return Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, {}])) as Terminology;
}

/** Keeps overrides of labels that exist in the catalog, non-empty and within the length limit. */
export function sanitizeTerminology(input: Partial<Record<Locale, unknown>>): Terminology {
  const out = emptyTerminology();
  for (const locale of SUPPORTED_LOCALES) {
    const known = new Set(catalogEntries(locale).map((e) => e.key));
    out[locale] = Object.fromEntries(Object.entries(sanitizeLabels(input[locale])).filter(([key]) => known.has(key)));
  }
  return out;
}

function setPath(target: Record<string, unknown>, key: string, value: string): void {
  const parts = key.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
    node = node[part] as Record<string, unknown>;
  }
  node[parts.at(-1)!] = value;
}

const applied = new WeakMap<I18n, Terminology>();

/** Overrides the labels of an i18next instance; keys dropped since the last call get their original text back. */
export function applyTerminology(i18n: I18n, terminology: Terminology): void {
  const clean = sanitizeTerminology(terminology);
  const previous = applied.get(i18n) ?? emptyTerminology();
  for (const locale of SUPPORTED_LOCALES) {
    const keys = new Set([...Object.keys(previous[locale]), ...Object.keys(clean[locale])]);
    if (keys.size === 0) continue;
    const bundle: Record<string, unknown> = {};
    for (const key of keys) {
      const text = clean[locale][key] ?? originalText(locale, key);
      if (text !== undefined) setPath(bundle, key, text);
    }
    i18n.addResourceBundle(locale, 'translation', bundle, true, true);
  }
  applied.set(i18n, clean);
}

export interface TerminologyState {
  labels: Terminology;
  loaded: boolean;
  error: Message | null;
  load: () => Promise<void>;
  save: (locale: Locale, labels: Record<string, string>) => Promise<boolean>;
  /** Removes every renamed label of a language (restores the product defaults). */
  reset: (locale: Locale) => Promise<boolean>;
}

export function createTerminologyStore(api?: CustomizationApi) {
  return createStore<TerminologyState>()((set, get) => ({
    labels: emptyTerminology(),
    loaded: !api,
    error: null,
    async load() {
      if (!api) return;
      try {
        set({ labels: sanitizeTerminology(await api.loadTerminology()), loaded: true });
      } catch {
        set({ loaded: true, error: { key: 'customization.errors.loadFailed' } });
      }
    },
    async save(locale, labels) {
      const clean = sanitizeTerminology({ [locale]: labels })[locale];
      try {
        await api?.saveTerminology(locale, clean);
        set({ labels: { ...get().labels, [locale]: clean }, error: null });
        return true;
      } catch (error) {
        set({ error: errorMessage(error) });
        return false;
      }
    },
    async reset(locale) {
      try {
        if (api?.resetTerminology) await api.resetTerminology(locale);
        else await api?.saveTerminology(locale, {});
        set({ labels: { ...get().labels, [locale]: {} }, error: null });
        return true;
      } catch (error) {
        set({ error: errorMessage(error) });
        return false;
      }
    },
  }));
}

export type TerminologyStore = ReturnType<typeof createTerminologyStore>;
