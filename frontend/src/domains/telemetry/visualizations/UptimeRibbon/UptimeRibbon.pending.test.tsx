import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { UptimeRibbon } from './UptimeRibbon';

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

const data = { label: 'Checkout API', status: 'DOWN', historyHours: 24, uptime: 99.5, segments: [{ from: new Date(2026, 9, 18, 17, 0).toISOString(), to: new Date(2026, 9, 18, 17, 30).toISOString(), status: 'OK' }, { from: new Date(2026, 9, 18, 17, 30).toISOString(), to: new Date(2026, 9, 18, 17, 36).toISOString(), status: 'DOWN' }, { from: new Date(2026, 9, 18, 17, 36).toISOString(), to: new Date(2026, 9, 18, 17, 50).toISOString(), status: 'OK' }] };

describe('FE-24 display mode 14: uptime ribbon', () => {
  it('renders the real data', () => {
    render(<UptimeRibbon data={data} />);
    expect(screen.getAllByRole('img', { name: /DOWN/ })).toHaveLength(1);
    expect(screen.getByText('99.5% uptime')).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<UptimeRibbon data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<UptimeRibbon data={data} />);
    const el = screen.getAllByText('99.5% uptime')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<UptimeRibbon data={{ label: 'Checkout API', status: 'OK', historyHours: 24, uptime: null, segments: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<UptimeRibbon data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<UptimeRibbon data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<UptimeRibbon data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<UptimeRibbon data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('99,5% de disponibilidade')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<UptimeRibbon data={{ label: 'Checkout API', status: 'OK', historyHours: 24, uptime: null, segments: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<UptimeRibbon data={{ ...data, label: `Card ${PAN}` }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
