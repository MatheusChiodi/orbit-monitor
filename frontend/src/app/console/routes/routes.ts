import { useCallback, useSyncExternalStore } from 'react';
import { MONITOR_KINDS, type MonitorKind } from '@/domains/monitor/form';

/** Console screens addressed by the URL hash (`index.html#/incidents/inc-1`); no router dependency. */
export type ConsoleRoute =
  | { name: 'monitors' }
  | { name: 'new-monitor'; kind?: MonitorKind }
  | { name: 'incidents' }
  | { name: 'incident'; id: string }
  | { name: 'maintenance' }
  | { name: 'dependencies' }
  | { name: 'reports' }
  | { name: 'status-pages' }
  | { name: 'audit' }
  | { name: 'settings' }
  | { name: 'preferences' }
  | { name: 'not-found' };

export type ConsoleRouteName = ConsoleRoute['name'];

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
  'admin/audit': { name: 'audit' },
  settings: { name: 'settings' },
  'settings/preferences': { name: 'preferences' },
};

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function parseRoute(hash: string): ConsoleRoute {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  const known = STATIC[path];
  if (known) return known;
  const kind = /^monitors\/new\/([a-z-]+)$/.exec(path)?.[1]?.toUpperCase().replace(/-/g, '_');
  const match = MONITOR_KINDS.find((k) => k === kind);
  if (match) return { name: 'new-monitor', kind: match };
  const incident = /^incidents\/([^/]+)$/.exec(path);
  if (incident) {
    const id = decode(incident[1]!);
    if (id) return { name: 'incident', id };
  }
  return { name: 'not-found' };
}

export function routeHref(route: ConsoleRoute): string {
  switch (route.name) {
    case 'monitors':
    case 'not-found':
      return '#/';
    case 'new-monitor':
      return route.kind ? `#/monitors/new/${route.kind.toLowerCase().replace(/_/g, '-')}` : '#/monitors/new';
    case 'incident':
      return `#/incidents/${encodeURIComponent(route.id)}`;
    case 'preferences':
      return '#/settings/preferences';
    default:
      return `#/${route.name}`;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const readHash = () => window.location.hash;

/** Current route plus a navigate function; back/forward work because the hash is the state. */
export function useHashRoute(): [ConsoleRoute, (route: ConsoleRoute) => void] {
  const hash = useSyncExternalStore(subscribe, readHash, () => '');
  const navigate = useCallback((route: ConsoleRoute) => {
    const href = routeHref(route);
    if (window.location.hash === href) return;
    window.location.hash = href;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);
  return [parseRoute(hash), navigate];
}
