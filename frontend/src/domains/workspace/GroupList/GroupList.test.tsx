import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { GroupList } from './GroupList';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

describe('GroupList', () => {
  it('lista grupos com resumo e monitores com estado em texto, regra e tipo', () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />);
    const pagamentos = screen.getByRole('region', { name: 'Pagamentos' });
    expect(within(pagamentos).getByText('2/4 ok · FORA')).toBeInTheDocument();
    const rows = within(pagamentos).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Fila de conciliação');
    expect(rows[0]).toHaveTextContent('FORA');
    expect(rows[0]).toHaveTextContent('SQL');
    expect(rows[0]).toHaveTextContent('QTD < 200');
    expect(rows[0]).toHaveTextContent('349 QTD');
  });

  it('filtra por texto', async () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filtrar monitores' }), 'tablespace');
    expect(screen.getByText('Tablespace USERS')).toBeInTheDocument();
    expect(screen.queryByText('Fila de conciliação')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Pagamentos' })).toBeNull();
  });

  it('botão Novo monitor só para quem edita', async () => {
    const onNewMonitor = vi.fn();
    const { rerender } = render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={onNewMonitor} />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo monitor' }));
    expect(onNewMonitor).toHaveBeenCalled();
    rerender(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={onNewMonitor} canEdit={false} />);
    expect(screen.queryByRole('button', { name: 'Novo monitor' })).toBeNull();
  });

  it('vazio', () => {
    render(<GroupList groups={[]} monitors={[]} onNewMonitor={vi.fn()} />);
    expect(screen.getByText('Nenhum monitor encontrado')).toBeInTheDocument();
  });
});
