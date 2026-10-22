import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../../mock';
import { Timeline } from './Timeline';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('Timeline', () => {
  it('events with time, title and detail', () => {
    const snap = mockSnapshot('incident', now);
    render(<Timeline events={snap.timeline} freshIds={new Set()} />);
    const region = screen.getByRole('region', { name: 'Timeline' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('17:05:59');
    expect(items[0]).toHaveTextContent('Reconciliation queue down');
    expect(items[0]).toHaveTextContent('QTY = 349 · rule QTY < 200');
  });

  it('labels in pt-BR', () => {
    renderWithLocale(<Timeline events={mockSnapshot('incident', now).timeline} freshIds={new Set()} />, 'pt-BR');
    expect(screen.getByRole('region', { name: 'Linha do tempo' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'reconhecido' })).toHaveLength(1);
  });

  it('acknowledgements come in blue (informational)', () => {
    render(<Timeline events={mockSnapshot('incident', now).timeline} freshIds={new Set()} />);
    const ack = screen.getByText('USERS tablespace acknowledged').closest('li');
    expect(ack).toHaveAttribute('data-kind', 'ACK');
    expect(ack?.querySelector('[data-dot]')?.className).toContain('bg-info');
  });

  it('a new event gets a fading highlight', () => {
    render(<Timeline events={mockSnapshot('incident', now).timeline} freshIds={new Set(['ev-1'])} />);
    const first = screen.getByText('Reconciliation queue down').closest('li');
    expect(first?.className).toContain('anim-flash');
  });

  it('empty', () => {
    render(<Timeline events={[]} freshIds={new Set()} />);
    expect(screen.getByText('No recent events')).toBeInTheDocument();
  });
});
