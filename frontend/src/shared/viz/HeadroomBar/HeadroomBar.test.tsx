import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { HeadroomBar } from './HeadroomBar';

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

const data = { label: 'Reconciliation queue', unit: 'QTY', status: 'WARN', value: 160, rule: { field: 'QTY', operator: '<', limit: 200 } };

describe('FE-24 display mode 4: headroom bar', () => {
  it('renders the real data', () => {
    render(<HeadroomBar data={data} />);
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('rule QTY < 200')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /Reconciliation queue/ })).toHaveAttribute('aria-valuenow', '20');
  });

  it('always shows the state as text, never by color alone', () => {
    render(<HeadroomBar data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<HeadroomBar data={data} />);
    const el = screen.getAllByText('20%')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<HeadroomBar data={{ label: 'Reconciliation queue', status: 'OK', value: null, rule: { field: 'QTY', operator: '<', limit: 200 } }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<HeadroomBar data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<HeadroomBar data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<HeadroomBar data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<HeadroomBar data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('regra QTY < 200')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<HeadroomBar data={{ label: 'Reconciliation queue', status: 'OK', value: null, rule: { field: 'QTY', operator: '<', limit: 200 } }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<HeadroomBar data={{ ...data, label: `Card ${PAN}` }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });

  it('turns amber below 25% headroom and green above', () => {
    const { container, rerender } = render(<HeadroomBar data={data} />);
    expect(container.querySelector('[data-fill]')).toHaveAttribute('data-fill', 'WARN');
    rerender(<HeadroomBar data={{ ...data, value: 50 }} />);
    expect(container.querySelector('[data-fill]')).toHaveAttribute('data-fill', 'OK');
  });
});
