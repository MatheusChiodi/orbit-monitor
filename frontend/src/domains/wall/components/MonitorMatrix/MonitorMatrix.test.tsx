import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../../mock';
import { groupRows } from '../../selectors';
import { MonitorMatrix } from './MonitorMatrix';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('MonitorMatrix', () => {
  it('rows per group with a summary and problem cells first', () => {
    const snap = mockSnapshot('incident', now);
    render(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set(['reconciliation'])} />);
    const region = screen.getByRole('region', { name: 'All monitors' });
    const groups = within(region).getAllByRole('group');
    expect(groups[0]).toHaveAccessibleName('Payments');
    expect(within(groups[0]!).getByText('2/4 ok · DOWN')).toBeInTheDocument();
    const cells = within(groups[0]!).getAllByRole('listitem');
    expect(cells[0]).toHaveTextContent('Reconciliation queue');
    expect(cells[0]).toHaveTextContent('349 QTY');
    expect(cells[0]).toHaveAttribute('data-status', 'DOWN');
  });

  it('names wrap instead of being cut ("Rec…"), with the full name as the tile title', () => {
    render(<MonitorMatrix rows={groupRows(mockSnapshot('incident', now))} unownedMonitorIds={new Set()} />);
    const name = screen.getByTitle('Reconciliation queue');
    expect(name).toHaveTextContent('Reconciliation queue');
    expect(name.className).not.toContain('truncate');
    expect(name.className).toContain('line-clamp-2');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<MonitorMatrix rows={groupRows(mockSnapshot('incident', now))} unownedMonitorIds={new Set()} />, 'pt-BR');
    const region = screen.getByRole('region', { name: 'Todos os monitores' });
    expect(within(region).getByText('2/4 ok · FORA')).toBeInTheDocument();
    expect(within(region).getByText('1.840 QTY')).toBeInTheDocument();
  });

  it('an unowned red cell blinks; an acknowledged one does not', () => {
    const snap = mockSnapshot('incident', now);
    const { container, rerender } = render(
      <MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set(['reconciliation'])} />,
    );
    expect(container.querySelectorAll('[data-status="DOWN"].anim-blink')).toHaveLength(1);
    rerender(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set()} />);
    expect(container.querySelectorAll('.anim-blink')).toHaveLength(0);
  });

  it('cell state is also text (accessible)', () => {
    render(<MonitorMatrix rows={groupRows(mockSnapshot('incident', now))} unownedMonitorIds={new Set()} />);
    expect(screen.getAllByRole('img', { name: 'DOWN' })).toHaveLength(1);
  });
});
