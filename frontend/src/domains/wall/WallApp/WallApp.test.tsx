import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../mock';
import * as wallAppModule from './WallApp';
import { WallApp } from './WallApp';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('WallApp', () => {
  it('without a backend shows demo data and acknowledges locally', async () => {
    const api = {
      getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')),
      acknowledgeIncident: vi.fn(),
    };
    render(<WallApp api={api} connect={vi.fn()} mock={() => mockSnapshot('incident', now)} />);
    expect(await screen.findByText('demo data')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(screen.getAllByText(/^Acknowledged at \d{2}:\d{2}$/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/M\. Chiodi|Operator acknowledged/)).toBeNull();
    expect(api.acknowledgeIncident).not.toHaveBeenCalled();
  });

  it('with a backend uses the API snapshot', async () => {
    const api = {
      getWallSnapshot: vi.fn().mockResolvedValue(mockSnapshot('ok', now)),
      acknowledgeIncident: vi.fn(),
    };
    const connect = vi.fn(() => ({ close: vi.fn() }));
    render(<WallApp api={api} connect={connect} />);
    expect(await screen.findByRole('heading', { name: 'All systems operational' })).toBeInTheDocument();
    expect(connect).toHaveBeenCalled();
  });

  it('pt-BR: local acknowledgement is written in Portuguese', async () => {
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    renderWithLocale(<WallApp api={api} connect={vi.fn()} mock={() => mockSnapshot('incident', now)} />, 'pt-BR');
    await userEvent.click(await screen.findByRole('button', { name: 'Reconhecer' }));
    expect(screen.getAllByText(/^Reconhecido às \d{2}:\d{2}$/).length).toBeGreaterThan(0);
  });
});

describe('no operator name on the wall', () => {
  it('there is no ?operator= helper any more', () => {
    expect('operatorName' in wallAppModule).toBe(false);
  });

  it('acknowledging sends only the incident id', async () => {
    const acknowledgeIncident = vi.fn().mockResolvedValue({ ...mockSnapshot('incident', now).incidents[0]!, acknowledgedBy: 'lan', acknowledgedAt: now.toISOString() });
    const api = { getWallSnapshot: vi.fn().mockResolvedValue(mockSnapshot('incident', now)), acknowledgeIncident };
    render(<WallApp api={api} connect={vi.fn(() => ({ close: vi.fn() }))} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge' }));
    await waitFor(() => expect(acknowledgeIncident).toHaveBeenCalledWith('inc-reconciliation'));
  });
});

describe('FE-49 phone layout', () => {
  it('on a phone the wall shows the on-call view', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((media: string) => ({ matches: media.includes('max-width'), addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    render(<WallApp api={api} connect={vi.fn()} mock={() => mockSnapshot('incident', now)} />);
    expect(await screen.findByRole('region', { name: 'Active incidents' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'All monitors' })).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('FE-45 / FE-47 / FE-48 wall runtime controls', () => {
  it('the header has a sound toggle (muted by default) that is remembered on the device', async () => {
    localStorage.clear();
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    render(<WallApp api={api} connect={vi.fn()} mock={() => mockSnapshot('incident', now)} />);
    const toggle = await screen.findByRole('switch', { name: 'Sound alerts' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(screen.getByRole('switch', { name: 'Sound alerts' })).toHaveAttribute('aria-checked', 'true');
    expect(JSON.parse(localStorage.getItem('orbit.sound') ?? '{}')).toMatchObject({ muted: false });
  });

  it('offers to enable desktop notifications on a client that can edit', async () => {
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    const loadAccess = vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' });
    render(<WallApp api={api} connect={vi.fn()} loadAccess={loadAccess} mock={() => mockSnapshot('incident', now)} />);
    expect(await screen.findByRole('button', { name: 'Enable desktop notifications' })).toBeInTheDocument();
  });

  it('a view-only TV and a kiosk get no desktop-notification button', async () => {
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    const viewOnly = vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' });
    const { unmount } = render(<WallApp api={api} connect={vi.fn()} loadAccess={viewOnly} mock={() => mockSnapshot('incident', now)} />);
    await screen.findByRole('switch', { name: 'Sound alerts' });
    await waitFor(() => expect(viewOnly).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /desktop notifications/ })).toBeNull();
    unmount();
    const edit = vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' });
    render(<WallApp api={api} connect={vi.fn()} kiosk loadAccess={edit} mock={() => mockSnapshot('incident', now)} />);
    await screen.findByRole('switch', { name: 'Sound alerts' });
    expect(screen.queryByRole('button', { name: /desktop notifications/ })).toBeNull();
  });

  it('kiosk mode holds a screen wake lock', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    render(<WallApp api={api} connect={vi.fn()} kiosk mock={() => mockSnapshot('incident', now)} />);
    await screen.findByText('demo data');
    // Kiosk code is a lazy chunk (wall budget).
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
  });
});
