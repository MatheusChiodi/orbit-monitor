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
