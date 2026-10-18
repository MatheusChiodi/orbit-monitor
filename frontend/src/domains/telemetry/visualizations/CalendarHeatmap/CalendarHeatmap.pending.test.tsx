import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { CalendarHeatmap } from './CalendarHeatmap';

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

const data = { label: 'Daily uptime', unit: '%', status: 'OK', historyHours: 24, days: [{ date: '2026-10-18', value: 99.9 }] };

describe('FE-24 display mode 13: calendar heatmap', () => {
  it('renders the real data', () => {
    render(<CalendarHeatmap data={data} />);
    expect(screen.getByRole('grid', { name: /Daily uptime/ })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: /99\.9%/ })).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<CalendarHeatmap data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<CalendarHeatmap data={data} />);
    const el = screen.getAllByText('99.9%')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<CalendarHeatmap data={{ label: 'Daily uptime', unit: '%', status: 'OK', historyHours: 24, days: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<CalendarHeatmap data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<CalendarHeatmap data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<CalendarHeatmap data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<CalendarHeatmap data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByRole('gridcell', { name: /99,9%/ })).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<CalendarHeatmap data={{ label: 'Daily uptime', unit: '%', status: 'OK', historyHours: 24, days: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<CalendarHeatmap data={{ ...data, label: `Card ${PAN}` }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });

  it('marks days outside the in-memory window as unavailable instead of zero', () => {
    render(<CalendarHeatmap data={data} />);
    expect(screen.getAllByRole('gridcell', { name: /no data/i }).length).toBeGreaterThan(0);
  });
});
