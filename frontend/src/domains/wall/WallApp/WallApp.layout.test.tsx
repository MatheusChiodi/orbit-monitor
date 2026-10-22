import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WallLayout } from '@/domains/workspace/layout/layoutsApi';
import type { WallSnapshot } from '@/shared/api/types';
import { ORBIT_DARK } from '@/shared/theme/registry';
import { mockSnapshot } from '../mock';
import { WallApp, type WallAppProps } from './WallApp';

const now = new Date(2026, 9, 18, 17, 10, 0);
const block = (kind: WallLayout['blocks'][number]['kind'], x = 0, y = 0) => ({ id: kind, kind, x, y, w: 6, h: 3 });
const exec: WallLayout = { id: 'l-exec', slug: 'exec', name: 'Executive', blocks: [block('clock'), block('uptime', 6)], themeId: 'nord' };

function api(snapshot: WallSnapshot) {
  return { getWallSnapshot: vi.fn().mockResolvedValue(snapshot), acknowledgeIncident: vi.fn() };
}

function setup(props: Partial<WallAppProps> = {}, snapshot = mockSnapshot('ok', now)) {
  return render(
    <WallApp
      api={api(snapshot)}
      connect={vi.fn(() => ({ close: vi.fn() }))}
      operator="Ana"
      search=""
      device={{}}
      loadLayout={vi.fn(async (slug: string) => (slug === 'exec' ? exec : null))}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.animation;
  document.documentElement.removeAttribute('style');
});

describe('FE-11 wall renders the saved layout by slug', () => {
  it('loads /api/layouts/{slug} and shows only its blocks; the clock block says who is on call', async () => {
    const loadOnCall = vi.fn(async () => [{ scheduleId: 's', scheduleName: 'Payments', person: 'Rui Prado', shiftEndsAt: null }]);
    setup({ layout: 'exec', loadOnCall });
    expect(await screen.findByText('24 h availability', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText('All monitors')).not.toBeInTheDocument();
    const onCall = await screen.findByRole('region', { name: 'On call' }, { timeout: 5000 });
    expect(within(onCall).getByText('Rui Prado')).toBeInTheDocument();
  });

  it('uses the on-call list sent with the snapshot (BE-33) without asking the REST endpoint', async () => {
    const loadOnCall = vi.fn(async () => []);
    const snapshot = { ...mockSnapshot('ok', now), onCall: [{ schedule: 'Payments', person: 'Lia Costa', shiftEndsAt: null }] };
    setup({ layout: 'exec', loadOnCall }, snapshot);
    const onCall = await screen.findByRole('region', { name: 'On call' }, { timeout: 5000 });
    expect(within(onCall).getByText('Lia Costa')).toBeInTheDocument();
    expect(loadOnCall).not.toHaveBeenCalled();
  });

  it('an unknown slug falls back to the built-in NOC wall', async () => {
    setup({ layout: 'missing' });
    expect(await screen.findByText('All monitors')).toBeInTheDocument();
  });
});

describe('FE-05 / FE-06 precedence on the wall', () => {
  it('the layout theme applies, and `?theme=` beats it', async () => {
    const { unmount } = setup({ layout: 'exec', device: { theme: 'kanagawa' } });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('nord'));
    unmount();
    setup({ layout: 'exec', search: '?theme=dracula' });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dracula'));
  });

  it('the device theme (FE-50) beats the workspace default', async () => {
    setup({ device: { theme: 'kanagawa' }, loadWorkspaceDefaults: async () => ({ theme: 'one-dark' }) });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('kanagawa'));
  });

  it('the workspace default theme and animation apply when nothing else is set', async () => {
    setup({ loadWorkspaceDefaults: async () => ({ theme: 'one-dark', animation: 'minimal' }) });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('one-dark'));
    expect(document.documentElement.dataset.animation).toBe('minimal');
  });

  it('`?motion=` beats the layout override, which beats the device level', async () => {
    const layout: WallLayout = { ...exec, animationLevel: 'minimal' };
    const { unmount } = setup({ layout: 'exec', loadLayout: async () => layout, device: { animation: 'expressive' } });
    await waitFor(() => expect(document.documentElement.dataset.animation).toBe('minimal'));
    unmount();
    setup({ layout: 'exec', loadLayout: async () => layout, search: '?motion=off' });
    await waitFor(() => expect(document.documentElement.dataset.animation).toBe('off'));
  });

  it('custom themes from orbit.themes.json can be the layout theme (invalid ones are dropped)', async () => {
    const valid = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', colors: { ...ORBIT_DARK.colors, bg: '#010203' } };
    const loadCustomThemes = vi.fn(async () => [{ id: 'broken', colors: { bg: 'red' } }, valid]);
    setup({ layout: 'exec', loadLayout: async () => ({ ...exec, themeId: 'noc-night' }), loadCustomThemes });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('noc-night'));
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe('#010203');
  });
});

describe('FE-19 playlist on the wall', () => {
  const rotation: WallLayout = {
    id: 'l-rot',
    slug: 'rotation',
    name: 'Rotation',
    blocks: [block('matrix')],
    playlist: { entries: [{ layout: 'rotation', seconds: 10 }, { layout: 'exec', seconds: 10 }] },
  };
  const loadLayout = async (slug: string) => (slug === 'rotation' ? rotation : slug === 'exec' ? exec : null);

  it('rotates layouts with a cross-fade and says where it is', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container } = setup({ layout: 'rotation', loadLayout });
    await screen.findByText('All monitors');
    expect(screen.getByText('Layout 1 of 2')).toBeInTheDocument();
    // Let React run the effects of the loaded layout before the clock moves.
    await act(async () => {});
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(await screen.findByText('24 h availability', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(container.querySelector('[data-layout="exec"]')).not.toBeNull();
    expect(screen.getByText('Layout 2 of 2')).toBeInTheDocument();
  });

  it('pauses while an incident is unacknowledged', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup({ layout: 'rotation', loadLayout }, mockSnapshot('incident', now));
    await screen.findByText('All monitors');
    await act(async () => {});
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText('Rotation paused: unacknowledged incident')).toBeInTheDocument();
    expect(screen.queryByText('24 h availability')).not.toBeInTheDocument();
  });
});

describe('FE-20 / FE-40 on the wall', () => {
  it('`?tile=2/4` shows one tile of a 2×2 video wall', async () => {
    setup({ search: '?tile=2/4' });
    expect(await screen.findByRole('region', { name: 'Tile 2 of 4' })).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--wall-tile-factor')).toBe('2');
  });

  it('the hero countdown names the next escalation step from the escalation API', async () => {
    const loadEscalation = vi.fn(async () => ({ policyName: 'Payments', nextStep: { index: 1, name: 'Team lead', at: '' } }));
    const snapshot = mockSnapshot('incident', new Date());
    // Without the step name in the wall payload the wall asks the escalation API.
    setup({ loadEscalation }, { ...snapshot, incidents: snapshot.incidents.map((i) => ({ ...i, nextStep: null })) });
    expect(await screen.findByText('next: Team lead', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(loadEscalation).toHaveBeenCalledWith('inc-reconciliation');
  });
});
