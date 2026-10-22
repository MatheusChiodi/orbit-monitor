import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { parseRoute, routeHref, useHashRoute, type ConsoleRoute } from './routes';

afterEach(() => {
  window.location.hash = '';
});

describe('console hash routes', () => {
  it.each<[string, ConsoleRoute]>([
    ['', { name: 'monitors' }],
    ['#/', { name: 'monitors' }],
    ['#/monitors/new', { name: 'new-monitor' }],
    ['#/monitors/new/sql', { name: 'new-monitor', kind: 'SQL' }],
    ['#/monitors/new/http-steps', { name: 'new-monitor', kind: 'HTTP_STEPS' }],
    ['#/monitors/new/smtp', { name: 'not-found' }],
    ['#/incidents', { name: 'incidents' }],
    ['#/incidents/inc-1', { name: 'incident', id: 'inc-1' }],
    ['#/incidents/a%20b', { name: 'incident', id: 'a b' }],
    ['#/maintenance', { name: 'maintenance' }],
    ['#/dependencies', { name: 'dependencies' }],
    ['#/reports', { name: 'reports' }],
    ['#/status-pages', { name: 'status-pages' }],
    ['#/audit', { name: 'audit' }],
    ['#/admin/audit', { name: 'audit' }],
    ['#/settings', { name: 'settings' }],
    ['#/settings/preferences', { name: 'preferences' }],
    ['#/nope', { name: 'not-found' }],
  ])('%s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('builds hrefs that parse back to the same route', () => {
    const routes: ConsoleRoute[] = [
      { name: 'monitors' },
      { name: 'incident', id: 'x/y' },
      { name: 'new-monitor', kind: 'KAFKA' },
      { name: 'reports' },
      { name: 'preferences' },
    ];
    for (const route of routes) expect(parseRoute(routeHref(route))).toEqual(route);
  });

  it('useHashRoute follows hash changes', () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current[0]).toEqual({ name: 'monitors' });
    act(() => {
      window.location.hash = '#/incidents/abc';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current[0]).toEqual({ name: 'incident', id: 'abc' });
    act(() => result.current[1]({ name: 'reports' }));
    expect(window.location.hash).toBe('#/reports');
    expect(result.current[0]).toEqual({ name: 'reports' });
  });
});
