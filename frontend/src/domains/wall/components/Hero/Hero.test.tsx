import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../../mock';
import { pickHero } from '../../selectors';
import { Hero } from './Hero';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function selection() {
  const hero = pickHero(mockSnapshot('incident', now));
  if (!hero) throw new Error('scenario without a hero');
  return hero;
}

describe('Hero', () => {
  it('aria-live region with identification, name, value, rule and deviation', () => {
    render(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />);
    const region = screen.getByRole('region', { name: 'Situation' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(within(region).getByText('DOWN')).toBeInTheDocument();
    expect(within(region).getByText('Payments')).toBeInTheDocument();
    expect(within(region).getByText('SQL')).toBeInTheDocument();
    expect(within(region).getByText('4min 01s ago')).toBeInTheDocument();
    expect(within(region).getByRole('heading', { name: 'Reconciliation queue' })).toBeInTheDocument();
    expect(within(region).getByText('349 QTY')).toBeInTheDocument();
    expect(within(region).getByText('rule QTY < 200')).toBeInTheDocument();
    expect(within(region).getByText('+75% over limit')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />, 'pt-BR');
    const region = screen.getByRole('region', { name: 'Situação' });
    expect(within(region).getByText('FORA')).toBeInTheDocument();
    expect(within(region).getByText('há 4min 01s')).toBeInTheDocument();
    expect(within(region).getByText('regra QTY < 200')).toBeInTheDocument();
    expect(within(region).getByText('+75% do limite')).toBeInTheDocument();
    expect(within(region).getByText('escalona em 11min 00s')).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Reconhecer' })).toBeInTheDocument();
  });

  it('shows the threshold chart, impact and escalation', () => {
    render(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('img', { name: /Last 60 min of QTY/ })).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('escalates in 11min 00s')).toBeInTheDocument();
  });

  it('blinks the side bar only when down and unowned', () => {
    const { container, rerender } = render(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />);
    expect(container.querySelector('[data-pulse="true"]')).not.toBeNull();
    const acked = selection();
    acked.incident = { ...acked.incident!, acknowledgedBy: 'Ana', acknowledgedAt: now.toISOString() };
    rerender(<Hero selection={acked} now={now} onAcknowledge={vi.fn()} />);
    expect(container.querySelector('[data-pulse="true"]')).toBeNull();
    expect(screen.queryByText(/escalates in/)).toBeNull();
  });

  it('the Acknowledge button calls back', async () => {
    const onAcknowledge = vi.fn();
    render(<Hero selection={selection()} now={now} onAcknowledge={onAcknowledge} />);
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(onAcknowledge).toHaveBeenCalledWith('inc-reconciliation');
  });

  it('no response shows "no response" as the value', () => {
    const s = selection();
    s.monitor = { ...s.monitor, value: null };
    render(<Hero selection={s} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getAllByText(/no response/).length).toBeGreaterThan(0);
  });
});
