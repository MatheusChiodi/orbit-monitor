import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nearLimit } from '@/domains/monitor/status';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../../mock';
import { NearLimit } from './NearLimit';

const now = new Date(2026, 9, 18, 17, 10, 0);
const items = () => nearLimit(mockSnapshot('incident', now).monitors);

describe('NearLimit', () => {
  it('headroom bars in order with value, rule and percentage', () => {
    render(<NearLimit items={items()} />);
    const region = screen.getByRole('region', { name: 'Near threshold' });
    const rows = within(region).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent('USERS tablespace');
    expect(rows[0]).toHaveTextContent('rule USED_PCT < 85');
    expect(rows[0]).toHaveTextContent('5%');
    const bar = within(rows[0]!).getByRole('meter', { name: 'Headroom of USERS tablespace' });
    expect(bar).toHaveAttribute('aria-valuenow', '5');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<NearLimit items={items()} />, 'pt-BR');
    const region = screen.getByRole('region', { name: 'Perto do limite' });
    expect(within(region).getAllByRole('listitem')[0]).toHaveTextContent('regra USED_PCT < 85');
    expect(within(region).getByRole('meter', { name: 'Folga de USERS tablespace' })).toBeInTheDocument();
  });

  it('amber bar below 25% headroom, green above', () => {
    const { container } = render(<NearLimit items={items()} />);
    const fills = container.querySelectorAll('[data-fill]');
    expect(fills[0]).toHaveAttribute('data-fill', 'WARN');
    expect(fills[fills.length - 1]).toHaveAttribute('data-fill', 'OK');
  });

  it('empty without numeric rules: says how to get one', () => {
    render(<NearLimit items={[]} />);
    expect(screen.getByText('No monitor has a numeric limit yet')).toBeInTheDocument();
    expect(screen.getByText(/response time < 1000 ms/)).toBeInTheDocument();
  });

  it('empty while rules wait for their first reading', () => {
    render(<NearLimit items={[]} empty="waiting" />);
    expect(screen.getByText('Waiting for the first readings')).toBeInTheDocument();
    expect(screen.queryByText('No monitor has a numeric limit yet')).toBeNull();
  });
});
