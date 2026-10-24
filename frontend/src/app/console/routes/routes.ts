import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { MONITOR_KINDS, type MonitorKind } from '@/domains/monitor/form';

/** Sections of `#/settings/:section` (FE-63); `general` is `#/settings`. */
export const SETTINGS_SECTIONS = ['general', 'appearance', 'wall-layouts', 'connections', 'advanced'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** Console screens addressed by the URL hash (`index.html#/incidents/inc-1`); no router dependency. */
export type ConsoleRoute =
  | { name: 'monitors' }
  | { name: 'new-monitor'; kind?: MonitorKind }
  | { name: 'monitor'; id: string }
  | { name: 'edit-monitor'; id: string }
  | { name: 'incidents' }
  | { name: 'incident'; id: string }
  | { name: 'maintenance' }
  | { name: 'dependencies' }
  | { name: 'reports' }
  | { name: 'status-pages' }
  | { name: 'audit' }
  | { name: 'settings'; section: SettingsSection; layoutId?: string }
  | { name: 'not-found' };

export type ConsoleRouteName = ConsoleRoute['name'];

/**
 * Pre-FE-63 destinations: still accepted by `navigate` / `routeHref` (they lead to their Settings section),
 * never returned by `parseRoute`.
 * @deprecated use `{ name: 'settings', section }`.
 */
export type LegacyRoute =
  | { name: 'preferences' }
  | { name: 'customization' }
  | { name: 'appearance' }
  | { name: 'layouts' }
  | { name: 'layout'; id: string };

export type RouteTarget = ConsoleRoute | LegacyRoute;

const STATIC: Record<string, ConsoleRoute> = {
  '': { name: 'monitors' },
  monitors: { name: 'monitors' },
  'monitors/new': { name: 'new-monitor' },
  incidents: { name: 'incidents' },
  maintenance: { name: 'maintenance' },
  dependencies: { name: 'dependencies' },
  reports: { name: 'reports' },
  'status-pages': { name: 'status-pages' },
  audit: { name: 'audit' },
  settings: { name: 'settings', section: 'general' },
};

/** Old addresses (bookmarks, docs) and where they live now. */
const LEGACY: Record<string, ConsoleRoute> = {
  'admin/audit': { name: 'audit' },
  'settings/preferences': { name: 'settings', section: 'appearance' },
  'settings/themes': { name: 'settings', section: 'appearance' },
  'settings/customization': { name: 'settings', section: 'advanced' },
  layouts: { name: 'settings', section: 'wall-layouts' },
};

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function pathOf(hash: string): string {
  return hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
}

function isSection(value: string): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

function withId(path: string, pattern: RegExp, build: (id: string) => ConsoleRoute): ConsoleRoute | null {
  const raw = pattern.exec(path)?.[1];
  if (raw === undefined) return null;
  const id = decode(raw);
  return id ? build(id) : null;
}

function parseLegacy(path: string): ConsoleRoute | null {
  return LEGACY[path] ?? withId(path, /^layouts\/([^/]+)$/, (layoutId) => ({ name: 'settings', section: 'wall-layouts', layoutId }));
}

export function parseRoute(hash: string): ConsoleRoute {
  const path = pathOf(hash);
  const known = STATIC[path] ?? parseLegacy(path);
  if (known) return known;
  const kind = /^monitors\/new\/([a-z-]+)$/.exec(path)?.[1]?.toUpperCase().replace(/-/g, '_');
  const match = MONITOR_KINDS.find((k) => k === kind);
  if (match) return { name: 'new-monitor', kind: match };
  const section = /^settings\/([a-z-]+)$/.exec(path)?.[1];
  if (section && isSection(section)) return { name: 'settings', section };
  return (
    withId(path, /^monitors\/([^/]+)\/edit$/, (id) => ({ name: 'edit-monitor', id })) ??
    withId(path, /^monitors\/(?!new$)([^/]+)$/, (id) => ({ name: 'monitor', id })) ??
    withId(path, /^incidents\/([^/]+)$/, (id) => ({ name: 'incident', id })) ??
    withId(path, /^settings\/wall-layouts\/([^/]+)$/, (layoutId) => ({ name: 'settings', section: 'wall-layouts', layoutId })) ?? {
      name: 'not-found',
    }
  );
}

/** The current address of a legacy hash (`#/layouts/x` → `#/settings/wall-layouts/x`), or null. */
export function redirectFor(hash: string): string | null {
  const route = parseLegacy(pathOf(hash));
  return route ? routeHref(route) : null;
}

function settingsHref(section: SettingsSection, layoutId?: string): string {
  if (section === 'general') return '#/settings';
  const base = `#/settings/${section}`;
  return section === 'wall-layouts' && layoutId ? `${base}/${encodeURIComponent(layoutId)}` : base;
}

export function routeHref(route: RouteTarget): string {
  switch (route.name) {
    case 'monitors':
    case 'not-found':
      return '#/';
    case 'new-monitor':
      return route.kind ? `#/monitors/new/${route.kind.toLowerCase().replace(/_/g, '-')}` : '#/monitors/new';
    case 'incident':
      return `#/incidents/${encodeURIComponent(route.id)}`;
    case 'monitor':
      return `#/monitors/${encodeURIComponent(route.id)}`;
    case 'edit-monitor':
      return `#/monitors/${encodeURIComponent(route.id)}/edit`;
    case 'settings':
      return settingsHref(route.section, route.layoutId);
    case 'preferences':
    case 'appearance':
      return settingsHref('appearance');
    case 'customization':
      return settingsHref('advanced');
    case 'layouts':
      return settingsHref('wall-layouts');
    case 'layout':
      return settingsHref('wall-layouts', route.id);
    default:
      return `#/${route.name}`;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const readHash = () => window.location.hash;

/**
 * Current route plus a navigate function; back/forward work because the hash is the state.
 * Legacy addresses are replaced in place (no extra history entry).
 */
export function useHashRoute(): [ConsoleRoute, (route: RouteTarget) => void] {
  const hash = useSyncExternalStore(subscribe, readHash, () => '');
  const navigate = useCallback((route: RouteTarget) => {
    const href = routeHref(route);
    if (window.location.hash === href) return;
    window.location.hash = href;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);
  useEffect(() => {
    const target = redirectFor(hash);
    if (!target) return;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${target}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, [hash]);
  return [parseRoute(hash), navigate];
}
