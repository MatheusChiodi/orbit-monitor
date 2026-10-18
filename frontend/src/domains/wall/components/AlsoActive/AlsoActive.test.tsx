import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../../mock';
import { alsoActive } from '../../selectors';
import { AlsoActive } from './AlsoActive';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('AlsoActive', () => {
  it('lists the other problems with state, name, value and time', () => {
    const snap = mockSnapshot('incident', now);
    render(<AlsoActive monitors={alsoActive(snap, 'reconciliation')} groups={snap.groups} now={now} />);
    const region = screen.getByRole('region', { name: 'Also active' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('WARNING');
    expect(within(region).getByText('USERS tablespace')).toBeInTheDocument();
    expect(within(region).getByText('81%')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    const snap = mockSnapshot('incident', now);
    renderWithLocale(<AlsoActive monitors={alsoActive(snap, 'reconciliation')} groups={snap.groups} now={now} />, 'pt-BR');
    const region = screen.getByRole('region', { name: 'Também ativos' });
    expect(within(region).getAllByRole('listitem')[0]).toHaveTextContent('ATENÇÃO');
    expect(within(region).getByText('1,7%')).toBeInTheDocument();
  });

  it('calm message when there are no others', () => {
    render(<AlsoActive monitors={[]} groups={[]} now={now} />);
    expect(screen.getByText('No other active problems')).toBeInTheDocument();
  });
});
