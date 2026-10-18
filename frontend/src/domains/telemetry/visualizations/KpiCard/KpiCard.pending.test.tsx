import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { KpiCard } from './KpiCard';

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

const data = { label: 'Batch', status: 'OK', items: [{ label: 'Pending', value: 12 }, { label: 'Error', value: 3 }, { label: 'Done', value: 1500 }] };

describe('FE-24 display mode 5: KPI card', () => {
  it('renders the real data', () => {
    render(<KpiCard data={data} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<KpiCard data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<KpiCard data={data} />);
    const el = screen.getAllByText('1,500')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<KpiCard data={{ label: 'Batch', status: 'OK', items: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<KpiCard data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<KpiCard data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<KpiCard data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<KpiCard data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('1.500')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<KpiCard data={{ label: 'Batch', status: 'OK', items: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<KpiCard data={{ ...data, items: [{ label: 'Card', value: PAN }] }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
