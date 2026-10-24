import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { isSettingsSection, settingsHref, type SettingsSection } from '@/app/settings/sections';
import { MONITOR_KINDS, type MonitorKind } from '@/domains/monitor/form';

/** Sections of `#/settings/:section` are owned by the Settings area (FE-72); `general` is `#/settings`. */
export { SETTINGS_SECTIONS, type SettingsSection } from '@/app/settings/sections';

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

/**
 * One-shot intents carried in the hash query (`#/maintenance?action=new-window`): the command palette
 * asks, the screen that owns the action performs it (`useRouteAction`) and the query is dropped.
 * Destructive ones (`delete`) only open the screen's confirmation.
 */
export const ROUTE_ACTIONS = [
  'new-group',
  'new-window',
  'new-status-page',
  'add-connection',
  'add-channel',
  'toggle-pause',
  'run',
  'delete',
] as const;
export type RouteAction = (typeof ROUTE_ACTIONS)[number];

export interface NavigateOptions {
  action?: RouteAction;
}

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

/** The path of a hash, without its `?query` (`#/monitors/new?from=x` → `monitors/new`). */
function pathOf(hash: string): string {
  return hash.replace(/^#/, '').split('?')[0]!.replace(/^\/+|\/+$/g, '');
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
  if (section && isSettingsSection(section)) return { name: 'settings', section };
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

/** `routeHref` plus a one-shot action (`#/monitors/m1?action=toggle-pause`). */
export function actionHref(route: RouteTarget, action: RouteAction): string {
  return `${routeHref(route)}?action=${action}`;
}

/** The action asked for in a hash, if any and known. */
export function routeActionOf(hash: string): RouteAction | null {
  const query = hash.split('?')[1];
  const action = query ? new URLSearchParams(query).get('action') : null;
  return ROUTE_ACTIONS.find((a) => a === action) ?? null;
}

function replaceHash(hash: string): void {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
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
export function useHashRoute(): [ConsoleRoute, (route: RouteTarget, options?: NavigateOptions) => void] {
  const hash = useSyncExternalStore(subscribe, readHash, () => '');
  const navigate = useCallback((route: RouteTarget, options: NavigateOptions = {}) => {
    const href = options.action ? actionHref(route, options.action) : routeHref(route);
    if (window.location.hash === href) return;
    window.location.hash = href;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);
  useEffect(() => {
    const target = redirectFor(hash);
    if (target) replaceHash(target);
  }, [hash]);
  return [parseRoute(hash), navigate];
}

/**
 * Runs `run` when the hash asks for `action` (`?action=…`), once, then drops the query so a reload or
 * Back never repeats it. Called by the screen that owns the action (new group, new window, pause…).
 */
export function useRouteAction(action: RouteAction, run: () => void): void {
  const hash = useSyncExternalStore(subscribe, readHash, () => '');
  const latest = useRef(run);
  latest.current = run;
  useEffect(() => {
    if (routeActionOf(hash) !== action) return;
    replaceHash(hash.split('?')[0]!);
    latest.current();
  }, [hash, action]);
}
