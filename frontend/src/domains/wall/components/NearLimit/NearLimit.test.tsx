import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nearLimit } from '@/domains/monitor/status';
import { mockSnapshot } from '../../mock';
import { NearLimit } from './NearLimit';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('NearLimit', () => {
  it('barras de folga ordenadas com valor, regra e percentual', () => {
    const items = nearLimit(mockSnapshot('incident', now).monitors);
    render(<NearLimit items={items} />);
    const region = screen.getByRole('region', { name: 'Perto do limite' });
    const rows = within(region).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent('Tablespace USERS');
    expect(rows[0]).toHaveTextContent('regra PCT_USO < 85');
    expect(rows[0]).toHaveTextContent('5%');
    const bar = within(rows[0]!).getByRole('meter');
    expect(bar).toHaveAttribute('aria-valuenow', '5');
  });

  it('barra âmbar abaixo de 25% de folga, verde acima', () => {
    const items = nearLimit(mockSnapshot('incident', now).monitors);
    const { container } = render(<NearLimit items={items} />);
    const fills = container.querySelectorAll('[data-fill]');
    expect(fills[0]).toHaveAttribute('data-fill', 'WARN');
    expect(fills[fills.length - 1]).toHaveAttribute('data-fill', 'OK');
  });

  it('vazio', () => {
    render(<NearLimit items={[]} />);
    expect(screen.getByText('Nenhum monitor com regra numérica')).toBeInTheDocument();
  });
});
