import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../mock';
import { WallApp, operatorName } from './WallApp';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('WallApp', () => {
  it('sem backend mostra dados de demonstração e reconhece localmente', async () => {
    const api = {
      getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')),
      acknowledgeIncident: vi.fn(),
    };
    render(<WallApp api={api} connect={vi.fn()} operator="M. Chiodi" mock={() => mockSnapshot('incident', now)} />);
    expect(await screen.findByText('dados de demonstração')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reconhecer' }));
    expect(screen.getAllByText(/M\. Chiodi reconheceu às/).length).toBeGreaterThan(0);
    expect(api.acknowledgeIncident).not.toHaveBeenCalled();
  });

  it('com backend usa o snapshot da API', async () => {
    const api = {
      getWallSnapshot: vi.fn().mockResolvedValue(mockSnapshot('ok', now)),
      acknowledgeIncident: vi.fn(),
    };
    const connect = vi.fn(() => ({ close: vi.fn() }));
    render(<WallApp api={api} connect={connect} operator="Ana" />);
    expect(await screen.findByRole('heading', { name: 'Tudo operacional' })).toBeInTheDocument();
    expect(connect).toHaveBeenCalled();
  });
});

describe('operatorName', () => {
  it('lê ?operador= da URL', () => {
    expect(operatorName('?operador=R.%20Lima', null)).toBe('R. Lima');
  });
  it('usa o salvo ou "Operador"', () => {
    expect(operatorName('', 'Ana')).toBe('Ana');
    expect(operatorName('', null)).toBe('Operador');
  });
});
