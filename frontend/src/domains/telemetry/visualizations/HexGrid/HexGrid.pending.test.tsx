import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { HexGrid } from './HexGrid';

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

const data = { label: 'All monitors', status: 'DOWN', monitors: [{ id: 'a', name: 'Checkout API', status: 'DOWN' }, { id: 'b', name: 'Web portal', status: 'OK' }, { id: 'c', name: 'DNS', status: 'OK' }] };

describe('FE-24 display mode 20: hex grid', () => {
  it('renders the real data', () => {
    render(<HexGrid data={data} />);
    expect(screen.getAllByRole('img', { name: /: (DOWN|OK)$/ })).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Checkout API: DOWN' })).toBeInTheDocument();
    expect(screen.getByText('1 down')).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<HexGrid data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByRole('img', { name: /DOWN/ }).length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<HexGrid data={data} />);
    const el = screen.getAllByText('1 down')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<HexGrid data={{ label: 'All monitors', status: 'OK', monitors: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<HexGrid data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<HexGrid data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<HexGrid data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<HexGrid data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    
    expect(screen.getByRole('img', { name: 'Checkout API: FORA' })).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<HexGrid data={{ label: 'All monitors', status: 'OK', monitors: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<HexGrid data={{ ...data, monitors: [{ id: 'x', name: PAN, status: 'OK' }] }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
