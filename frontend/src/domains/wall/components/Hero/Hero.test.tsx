import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../../mock';
import { pickHero } from '../../selectors';
import { Hero } from './Hero';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function selection() {
  const hero = pickHero(mockSnapshot('incident', now));
  if (!hero) throw new Error('cenário sem herói');
  return hero;
}

describe('Hero', () => {
  it('região aria-live com identificação, nome, valor, regra e desvio', () => {
    render(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />);
    const region = screen.getByRole('region', { name: 'Situação' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(within(region).getByText('FORA')).toBeInTheDocument();
    expect(within(region).getByText('Pagamentos')).toBeInTheDocument();
    expect(within(region).getByText('SQL')).toBeInTheDocument();
    expect(within(region).getByText('há 4min 01s')).toBeInTheDocument();
    expect(within(region).getByRole('heading', { name: 'Fila de conciliação' })).toBeInTheDocument();
    expect(within(region).getByText('349 QTD')).toBeInTheDocument();
    expect(within(region).getByText('regra QTD < 200')).toBeInTheDocument();
    expect(within(region).getByText('+75% do limite')).toBeInTheDocument();
  });

  it('mostra gráfico de limite, impacto e escalonamento', () => {
    render(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('img', { name: /Últimos 60 min de QTD/ })).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('escalona em 11min 00s')).toBeInTheDocument();
  });

  it('pisca a barra lateral só quando fora e sem responsável', () => {
    const { container, rerender } = render(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />);
    expect(container.querySelector('[data-pulse="true"]')).not.toBeNull();
    const acked = selection();
    acked.incident = { ...acked.incident!, acknowledgedBy: 'Ana', acknowledgedAt: now.toISOString() };
    rerender(<Hero selection={acked} now={now} onAcknowledge={vi.fn()} />);
    expect(container.querySelector('[data-pulse="true"]')).toBeNull();
    expect(screen.queryByText(/escalona em/)).toBeNull();
  });

  it('botão Reconhecer chama o callback', async () => {
    const onAcknowledge = vi.fn();
    render(<Hero selection={selection()} now={now} onAcknowledge={onAcknowledge} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reconhecer' }));
    expect(onAcknowledge).toHaveBeenCalledWith('inc-conciliacao');
  });

  it('sem resposta mostra "sem resposta" no valor', () => {
    const s = selection();
    s.monitor = { ...s.monitor, value: null };
    render(<Hero selection={s} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByText('sem resposta')).toBeInTheDocument();
  });
});
