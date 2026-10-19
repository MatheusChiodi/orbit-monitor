import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { LiveTable } from './LiveTable';

const PAN = '4111 1111 1111 1111';
const MASKED = '•••• •••• •••• 1111';

function reducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: matches && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const data = { label: 'Stuck transactions', status: 'WARN', columns: ['ID', 'MERCHANT', 'MINUTES'], rows: [{ ID: 'tx-1', MERCHANT: 'Store A', MINUTES: 4 }, { ID: 'tx-2', MERCHANT: 'Store B', MINUTES: 18 }], rule: { field: 'MINUTES', operator: '<', limit: 10 } };

describe('FE-24 display mode 17: live table', () => {
  it('renders the real data', () => {
    render(<LiveTable data={data} />);
    const table = screen.getByRole('table', { name: /Stuck transactions/ });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['ID', 'MERCHANT', 'MINUTES']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[1]).toHaveAttribute('data-violates', 'true');
    expect(rows[1]).toHaveTextContent('violates the rule');
    expect(rows[0]).not.toHaveAttribute('data-violates', 'true');
  });

  it('always shows the state as text, never by color alone', () => {
    render(<LiveTable data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<LiveTable data={data} />);
    const el = screen.getAllByText('18')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<LiveTable data={{ label: 'Stuck transactions', status: 'OK', columns: ['ID'], rows: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<LiveTable data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<LiveTable data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<LiveTable data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<LiveTable data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('viola a regra')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<LiveTable data={{ label: 'Stuck transactions', status: 'OK', columns: ['ID'], rows: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<LiveTable data={{ ...data, rows: [{ ID: 'tx-9', MERCHANT: PAN, MINUTES: 1 }] }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
