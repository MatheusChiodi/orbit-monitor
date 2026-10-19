import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { WeekdayHourHeatmap } from './WeekdayHourHeatmap';

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

const data = { label: 'Errors per hour', status: 'OK', historyHours: 24, cells: [{ weekday: 0, hour: 9, value: 30 }, { weekday: 0, hour: 10, value: 12 }] };

describe('FE-24 display mode 12: hour × weekday heatmap', () => {
  it('renders the real data', () => {
    render(<WeekdayHourHeatmap data={data} />);
    expect(screen.getByRole('grid', { name: /Errors per hour/ })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: /09:00.*30/ })).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<WeekdayHourHeatmap data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<WeekdayHourHeatmap data={data} />);
    const el = screen.getAllByText('30')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<WeekdayHourHeatmap data={{ label: 'Errors per hour', status: 'OK', historyHours: 24, cells: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<WeekdayHourHeatmap data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<WeekdayHourHeatmap data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<WeekdayHourHeatmap data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<WeekdayHourHeatmap data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByRole('gridcell', { name: /seg.*09:00/i })).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<WeekdayHourHeatmap data={{ label: 'Errors per hour', status: 'OK', historyHours: 24, cells: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<WeekdayHourHeatmap data={{ ...data, label: `Card ${PAN}` }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
