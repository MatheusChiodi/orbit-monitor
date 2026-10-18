import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { Donut } from './Donut';

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

const data = { label: 'Share by brand', status: 'OK', categories: [{ name: 'Visa', value: 50 }, { name: 'Master', value: 30 }, { name: 'Elo', value: 20 }] };

describe('FE-24 display mode 11: donut', () => {
  it('renders the real data', () => {
    render(<Donut data={data} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Share by brand/ })).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<Donut data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<Donut data={data} />);
    const el = screen.getAllByText('50%')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<Donut data={{ label: 'Share by brand', status: 'OK', categories: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<Donut data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<Donut data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<Donut data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<Donut data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<Donut data={{ label: 'Share by brand', status: 'OK', categories: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<Donut data={{ ...data, categories: [{ name: PAN, value: 1 }] }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });

  it('groups everything beyond 5 slices into "Other" (at most 6 slices)', () => {
    const many = { ...data, categories: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((name, i) => ({ name, value: 10 - i })) };
    render(<Donut data={many} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
