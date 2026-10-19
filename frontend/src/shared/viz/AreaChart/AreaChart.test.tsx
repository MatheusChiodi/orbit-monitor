import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { AreaChart } from './AreaChart';

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

const data = { label: 'Volume', unit: 'tx', status: 'OK', historyHours: 24, points: [{ at: new Date(2026, 9, 18, 17, 0).toISOString(), value: 1000 }, { at: new Date(2026, 9, 18, 17, 10).toISOString(), value: 1200 }, { at: new Date(2026, 9, 18, 17, 20).toISOString(), value: 1500 }] };

describe('FE-24 display mode 7: area chart', () => {
  it('renders the real data', () => {
    render(<AreaChart data={data} />);
    expect(screen.getByRole('img', { name: /Volume/ })).toBeInTheDocument();
    expect(screen.getByText('1,500 tx')).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<AreaChart data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<AreaChart data={data} />);
    const el = screen.getAllByText('1,500 tx')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<AreaChart data={{ label: 'Volume', unit: 'tx', status: 'OK', historyHours: 24, points: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<AreaChart data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<AreaChart data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<AreaChart data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<AreaChart data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('1.500 tx')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<AreaChart data={{ label: 'Volume', unit: 'tx', status: 'OK', historyHours: 24, points: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<AreaChart data={{ ...data, label: `Card ${PAN}` }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
