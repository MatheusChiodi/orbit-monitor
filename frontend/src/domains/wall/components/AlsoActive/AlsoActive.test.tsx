import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockSnapshot } from '../../mock';
import { alsoActive } from '../../selectors';
import { AlsoActive } from './AlsoActive';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('AlsoActive', () => {
  it('lista os outros problemas com estado, nome, valor e tempo', () => {
    const snap = mockSnapshot('incident', now);
    render(<AlsoActive monitors={alsoActive(snap, 'conciliacao')} groups={snap.groups} now={now} />);
    const region = screen.getByRole('region', { name: 'Também ativos' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('ATENÇÃO');
    expect(within(region).getByText('Tablespace USERS')).toBeInTheDocument();
    expect(within(region).getByText('81%')).toBeInTheDocument();
  });

  it('mensagem calma quando não há outros', () => {
    render(<AlsoActive monitors={[]} groups={[]} now={now} />);
    expect(screen.getByText('Nenhum outro problema ativo')).toBeInTheDocument();
  });
});
