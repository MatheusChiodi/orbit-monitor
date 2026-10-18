import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { BulletChart } from './BulletChart';

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

const data = { label: 'Throughput', unit: 'tx/min', status: 'OK', value: 120, target: 150, bands: [{ to: 100, status: 'DOWN' }, { to: 140, status: 'WARN' }, { to: 200, status: 'OK' }] };

describe('FE-24 display mode 3: bullet chart', () => {
  it('renders the real data', () => {
    render(<BulletChart data={data} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('target 150')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /Throughput/ })).toHaveAttribute('aria-valuenow', '120');
    expect(screen.getAllByTestId('bullet-band')).toHaveLength(3);
  });

  it('always shows the state as text, never by color alone', () => {
    render(<BulletChart data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<BulletChart data={data} />);
    const el = screen.getAllByText('120')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<BulletChart data={{ label: 'Throughput', status: 'OK', value: null, target: 150, bands: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<BulletChart data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<BulletChart data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<BulletChart data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<BulletChart data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('meta 150')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<BulletChart data={{ label: 'Throughput', status: 'OK', value: null, target: 150, bands: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<BulletChart data={{ ...data, label: `Card ${PAN}` }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
