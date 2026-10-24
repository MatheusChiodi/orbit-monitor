import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { actionHref, parseRoute, redirectFor, routeActionOf, routeHref, useHashRoute, useRouteAction, type ConsoleRoute } from './routes';

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
    ['#/monitors/recon%2Fq', { name: 'monitor', id: 'recon/q' }],
    ['#/monitors/recon%2Fq/edit', { name: 'edit-monitor', id: 'recon/q' }],
    ['#/incidents/inc-1', { name: 'incident', id: 'inc-1' }],
    ['#/incidents/a%20b', { name: 'incident', id: 'a b' }],
    ['#/maintenance', { name: 'maintenance' }],
    ['#/dependencies', { name: 'dependencies' }],
    ['#/reports', { name: 'reports' }],
    ['#/status-pages', { name: 'status-pages' }],
    ['#/audit', { name: 'audit' }],
    ['#/settings', { name: 'settings', section: 'general' }],
    ['#/settings/general', { name: 'settings', section: 'general' }],
    ['#/settings/appearance', { name: 'settings', section: 'appearance' }],
    ['#/settings/wall-layouts', { name: 'settings', section: 'wall-layouts' }],
    ['#/settings/wall-layouts/l%20exec', { name: 'settings', section: 'wall-layouts', layoutId: 'l exec' }],
    ['#/settings/connections', { name: 'settings', section: 'connections' }],
    ['#/settings/advanced', { name: 'settings', section: 'advanced' }],
    ['#/settings/nope', { name: 'not-found' }],
    ['#/nope', { name: 'not-found' }],
  ])('%s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it.each([
    ['#/settings/preferences', '#/settings/appearance'],
    ['#/settings/themes', '#/settings/appearance'],
    ['#/settings/customization', '#/settings/advanced'],
    ['#/layouts', '#/settings/wall-layouts'],
    ['#/layouts/l%20exec', '#/settings/wall-layouts/l%20exec'],
    ['#/admin/audit', '#/audit'],
  ])('legacy %s redirects to %s', (legacy, current) => {
    expect(redirectFor(legacy)).toBe(current);
    expect(parseRoute(legacy)).toEqual(parseRoute(current));
  });

  it('current addresses never redirect', () => {
    for (const hash of ['#/', '#/settings', '#/settings/appearance', '#/audit', '#/monitors/a/edit']) expect(redirectFor(hash)).toBeNull();
  });

  it('builds hrefs that parse back to the same route', () => {
    const routes: ConsoleRoute[] = [
      { name: 'monitors' },
      { name: 'incident', id: 'x/y' },
      { name: 'new-monitor', kind: 'KAFKA' },
      { name: 'edit-monitor', id: 'a b' },
      { name: 'reports' },
      { name: 'settings', section: 'general' },
      { name: 'settings', section: 'connections' },
      { name: 'settings', section: 'wall-layouts', layoutId: 'l/1' },
    ];
    for (const route of routes) expect(parseRoute(routeHref(route))).toEqual(route);
  });

  it('legacy targets still navigate to their Settings section', () => {
    expect(routeHref({ name: 'preferences' })).toBe('#/settings/appearance');
    expect(routeHref({ name: 'appearance' })).toBe('#/settings/appearance');
    expect(routeHref({ name: 'customization' })).toBe('#/settings/advanced');
    expect(routeHref({ name: 'layouts' })).toBe('#/settings/wall-layouts');
    expect(routeHref({ name: 'layout', id: 'l exec' })).toBe('#/settings/wall-layouts/l%20exec');
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

  it('useHashRoute replaces a legacy hash with its current address without a new history entry', () => {
    const length = window.history.length;
    window.location.hash = '#/settings/themes';
    const { result } = renderHook(() => useHashRoute());
    expect(window.location.hash).toBe('#/settings/appearance');
    expect(result.current[0]).toEqual({ name: 'settings', section: 'appearance' });
    expect(window.history.length).toBe(length + 1);
  });

  it('a query never changes the route (#/monitors/new?from=m1)', () => {
    expect(parseRoute('#/monitors/new?from=m1')).toEqual({ name: 'new-monitor' });
    expect(parseRoute('#/monitors/m1?action=toggle-pause')).toEqual({ name: 'monitor', id: 'm1' });
    expect(parseRoute('#/settings/notifications?action=add-channel')).toEqual({ name: 'settings', section: 'notifications' });
  });

  it('actions travel in the hash query and only known ones are read', () => {
    expect(actionHref({ name: 'monitor', id: 'a b' }, 'delete')).toBe('#/monitors/a%20b?action=delete');
    expect(routeActionOf('#/maintenance?action=new-window')).toBe('new-window');
    expect(routeActionOf('#/maintenance?action=format-disk')).toBeNull();
    expect(routeActionOf('#/maintenance')).toBeNull();
  });

  it('useRouteAction runs once for its action and drops the query', () => {
    const run = vi.fn();
    const other = vi.fn();
    window.location.hash = '#/maintenance?action=new-window';
    const { rerender } = renderHook(() => {
      useRouteAction('new-window', run);
      useRouteAction('new-group', other);
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/maintenance');
    rerender();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('navigate can carry an action', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current[1]({ name: 'status-pages' }, { action: 'new-status-page' }));
    expect(window.location.hash).toBe('#/status-pages?action=new-status-page');
    expect(result.current[0]).toEqual({ name: 'status-pages' });
  });
});
