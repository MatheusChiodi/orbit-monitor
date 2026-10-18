import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockSnapshot } from '../../mock';
import { groupRows } from '../../selectors';
import { MonitorMatrix } from './MonitorMatrix';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('MonitorMatrix', () => {
  it('linhas por grupo com resumo e células com problema primeiro', () => {
    const snap = mockSnapshot('incident', now);
    render(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set(['conciliacao'])} />);
    const region = screen.getByRole('region', { name: 'Todos os monitores' });
    const groups = within(region).getAllByRole('group');
    expect(groups[0]).toHaveAccessibleName('Pagamentos');
    expect(within(groups[0]!).getByText('2/4 ok · FORA')).toBeInTheDocument();
    const cells = within(groups[0]!).getAllByRole('listitem');
    expect(cells[0]).toHaveTextContent('Fila de conciliação');
    expect(cells[0]).toHaveTextContent('349 QTD');
    expect(cells[0]).toHaveAttribute('data-status', 'DOWN');
  });

  it('célula vermelha sem responsável pisca; reconhecida não', () => {
    const snap = mockSnapshot('incident', now);
    const { container, rerender } = render(
      <MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set(['conciliacao'])} />,
    );
    expect(container.querySelectorAll('[data-status="DOWN"].anim-blink')).toHaveLength(1);
    rerender(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set()} />);
    expect(container.querySelectorAll('.anim-blink')).toHaveLength(0);
  });

  it('estado da célula também em texto (acessível)', () => {
    const snap = mockSnapshot('incident', now);
    render(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set()} />);
    expect(screen.getAllByRole('img', { name: 'FORA' })).toHaveLength(1);
  });
});
