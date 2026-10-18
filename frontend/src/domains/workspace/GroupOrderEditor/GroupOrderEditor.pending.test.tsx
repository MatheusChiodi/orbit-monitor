import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { renderWithLocale } from '@/test/renderWithLocale';
import { GroupOrderEditor } from './GroupOrderEditor';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

describe('FE-13 reorder monitors and groups (console)', () => {
  it('lists groups and their monitors as sortable lists', () => {
    render(<GroupOrderEditor groups={snap.groups} monitors={snap.monitors} onChange={vi.fn()} />);
    const payments = screen.getByRole('listbox', { name: 'Payments' });
    expect(within(payments).getAllByRole('option')[0]).toHaveTextContent('Reconciliation queue');
  });

  it('keyboard: Space grabs a monitor, ArrowDown moves it, Space drops and reports the new order', async () => {
    const onChange = vi.fn();
    render(<GroupOrderEditor groups={snap.groups} monitors={snap.monitors} onChange={onChange} />);
    const first = within(screen.getByRole('listbox', { name: 'Payments' })).getAllByRole('option')[0]!;
    first.focus();
    await userEvent.keyboard(' {ArrowDown} ');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ pay: ['checkout', 'reconciliation', 'acquirer', 'refunds'] }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Reconciliation queue moved to position 2 of 4');
  });

  it('keyboard: ArrowRight moves the grabbed monitor to the next group', async () => {
    const onChange = vi.fn();
    render(<GroupOrderEditor groups={snap.groups} monitors={snap.monitors} onChange={onChange} />);
    const first = within(screen.getByRole('listbox', { name: 'Payments' })).getAllByRole('option')[0]!;
    first.focus();
    await userEvent.keyboard(' {ArrowRight} ');
    const order = onChange.mock.calls.at(-1)?.[0] as Record<string, string[]>;
    expect(order.portal).toContain('reconciliation');
    expect(order.pay).not.toContain('reconciliation');
  });

  it('Esc cancels without calling onChange', async () => {
    const onChange = vi.fn();
    render(<GroupOrderEditor groups={snap.groups} monitors={snap.monitors} onChange={onChange} />);
    within(screen.getByRole('listbox', { name: 'Payments' })).getAllByRole('option')[0]!.focus();
    await userEvent.keyboard(' {ArrowDown}{Escape}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('read-only when not editable', () => {
    render(<GroupOrderEditor groups={snap.groups} monitors={snap.monitors} onChange={vi.fn()} editable={false} />);
    expect(screen.getByRole('listbox', { name: 'Payments' })).toHaveAttribute('aria-readonly', 'true');
  });

  it('announces in pt-BR', async () => {
    renderWithLocale(<GroupOrderEditor groups={snap.groups} monitors={snap.monitors} onChange={vi.fn()} />, 'pt-BR');
    within(screen.getByRole('listbox', { name: 'Payments' })).getAllByRole('option')[0]!.focus();
    await userEvent.keyboard(' {ArrowDown}');
    expect(screen.getByRole('status')).toHaveTextContent('Reconciliation queue movido para a posição 2 de 4');
  });

  it('values rendered through SafeValue: a PAN in a monitor name never reaches the DOM', () => {
    const monitors = [{ ...snap.monitors[0]!, name: 'Card 4111 1111 1111 1111 check' }];
    const { container } = render(<GroupOrderEditor groups={snap.groups} monitors={monitors} onChange={vi.fn()} />);
    expect(container.textContent).not.toMatch(/4111[ -]?1111[ -]?1111[ -]?1111/);
  });
});
