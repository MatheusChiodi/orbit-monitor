import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockSnapshot } from '../../mock';
import { Timeline } from './Timeline';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('Timeline', () => {
  it('eventos com horário, título e detalhe', () => {
    const snap = mockSnapshot('incident', now);
    render(<Timeline events={snap.timeline} freshIds={new Set()} />);
    const region = screen.getByRole('region', { name: 'Linha do tempo' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('17:05:59');
    expect(items[0]).toHaveTextContent('Fila de conciliação fora do ar');
    expect(items[0]).toHaveTextContent('QTD = 349 · regra QTD < 200');
  });

  it('reconhecimento entra em azul (informativo)', () => {
    const snap = mockSnapshot('incident', now);
    render(<Timeline events={snap.timeline} freshIds={new Set()} />);
    const ack = screen.getByText('R. Lima reconheceu Tablespace USERS').closest('li');
    expect(ack).toHaveAttribute('data-kind', 'ACK');
    expect(ack?.querySelector('[data-dot]')?.className).toContain('bg-info');
  });

  it('evento novo recebe destaque que esvanece', () => {
    const snap = mockSnapshot('incident', now);
    render(<Timeline events={snap.timeline} freshIds={new Set(['ev-1'])} />);
    const first = screen.getByText('Fila de conciliação fora do ar').closest('li');
    expect(first?.className).toContain('anim-flash');
  });

  it('vazio', () => {
    render(<Timeline events={[]} freshIds={new Set()} />);
    expect(screen.getByText('Sem eventos recentes')).toBeInTheDocument();
  });
});
