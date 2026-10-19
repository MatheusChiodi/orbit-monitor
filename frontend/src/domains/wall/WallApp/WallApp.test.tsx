import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../mock';
import { WallApp, operatorName } from './WallApp';

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
    render(<WallApp api={api} connect={vi.fn()} operator="M. Chiodi" mock={() => mockSnapshot('incident', now)} />);
    expect(await screen.findByText('demo data')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(screen.getAllByText(/M\. Chiodi acknowledged at/).length).toBeGreaterThan(0);
    expect(api.acknowledgeIncident).not.toHaveBeenCalled();
  });

  it('with a backend uses the API snapshot', async () => {
    const api = {
      getWallSnapshot: vi.fn().mockResolvedValue(mockSnapshot('ok', now)),
      acknowledgeIncident: vi.fn(),
    };
    const connect = vi.fn(() => ({ close: vi.fn() }));
    render(<WallApp api={api} connect={connect} operator="Ana" />);
    expect(await screen.findByRole('heading', { name: 'All systems operational' })).toBeInTheDocument();
    expect(connect).toHaveBeenCalled();
  });

  it('pt-BR: local acknowledgement is written in Portuguese', async () => {
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    renderWithLocale(<WallApp api={api} connect={vi.fn()} operator="M. Chiodi" mock={() => mockSnapshot('incident', now)} />, 'pt-BR');
    await userEvent.click(await screen.findByRole('button', { name: 'Reconhecer' }));
    expect(screen.getAllByText(/M\. Chiodi reconheceu às/).length).toBeGreaterThan(0);
  });
});

describe('operatorName', () => {
  it('reads ?operator= from the URL', () => {
    expect(operatorName('?operator=R.%20Lima', null)).toBe('R. Lima');
  });
  it('uses the saved name or "Operator"', () => {
    expect(operatorName('', 'Ana')).toBe('Ana');
    expect(operatorName('', null)).toBe('Operator');
  });
});

describe('FE-49 phone layout', () => {
  it('on a phone the wall shows the on-call view', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((media: string) => ({ matches: media.includes('max-width'), addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    render(<WallApp api={api} connect={vi.fn()} operator="Ana" mock={() => mockSnapshot('incident', now)} />);
    expect(await screen.findByRole('region', { name: 'Active incidents' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'All monitors' })).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('FE-45 / FE-47 / FE-48 wall runtime controls', () => {
  it('the header has a sound toggle (muted by default) that is remembered on the device', async () => {
    localStorage.clear();
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    render(<WallApp api={api} connect={vi.fn()} operator="Ana" mock={() => mockSnapshot('incident', now)} />);
    const toggle = await screen.findByRole('button', { name: 'Sound alerts' });
    expect(toggle).toHaveTextContent('Muted');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Sound alerts' })).toHaveTextContent('Sound on');
    expect(JSON.parse(localStorage.getItem('orbit.sound') ?? '{}')).toMatchObject({ muted: false });
  });

  it('offers to enable desktop notifications', async () => {
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    render(<WallApp api={api} connect={vi.fn()} operator="Ana" mock={() => mockSnapshot('incident', now)} />);
    expect(await screen.findByRole('button', { name: 'Enable desktop notifications' })).toBeInTheDocument();
  });

  it('kiosk mode holds a screen wake lock', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
    render(<WallApp api={api} connect={vi.fn()} operator="Ana" kiosk mock={() => mockSnapshot('incident', now)} />);
    await screen.findByText('demo data');
    expect(request).toHaveBeenCalledWith('screen');
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
  });
});
