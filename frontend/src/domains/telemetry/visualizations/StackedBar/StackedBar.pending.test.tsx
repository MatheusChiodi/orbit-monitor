import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { StackedBar } from './StackedBar';

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

const data = { label: 'Authorizations', status: 'OK', keys: ['approved', 'declined'], categories: [{ name: 'Cielo', values: { approved: 90, declined: 10 } }, { name: 'Rede', values: { approved: 45, declined: 5 } }] };

describe('FE-24 display mode 10: stacked bar', () => {
  it('renders the real data', () => {
    render(<StackedBar data={data} />);
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('declined')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getAllByTestId('stack-segment')).toHaveLength(4);
  });

  it('always shows the state as text, never by color alone', () => {
    render(<StackedBar data={{ ...data, status: 'DOWN' as const }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<StackedBar data={data} />);
    const el = screen.getAllByText('100')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<StackedBar data={{ label: 'Authorizations', status: 'OK', keys: [], categories: [] }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<StackedBar data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<StackedBar data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<StackedBar data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<StackedBar data={{ ...data, status: 'DOWN' as const }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('approved')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<StackedBar data={{ label: 'Authorizations', status: 'OK', keys: [], categories: [] }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<StackedBar data={{ ...data, categories: [{ name: PAN, values: { approved: 1, declined: 0 } }] }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });
});
