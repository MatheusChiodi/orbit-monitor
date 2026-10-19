import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { TextStatus } from './TextStatus';

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

const data = { label: 'Gateway status', status: 'WARN', value: 'DEGRADED', mapping: { UP: 'OK', DEGRADED: 'WARN', DOWN: 'DOWN' } };

describe('FE-24 display mode 16: status pill (text mapped to colors)', () => {
  it('renders the real data', () => {
    render(<TextStatus data={data} />);
    expect(screen.getByText('DEGRADED')).toBeInTheDocument();
    expect(screen.getByText('DEGRADED').closest('[data-status]')).toHaveAttribute('data-status', 'WARN');
    expect(screen.getByText('WARNING')).toBeInTheDocument();
  });

  it('always shows the state as text, never by color alone', () => {
    render(<TextStatus data={{ ...data, status: 'DOWN' as const, value: 'DOWN' }} />);
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('renders values in tabular mono', () => {
    render(<TextStatus data={data} />);
    const el = screen.getAllByText('DEGRADED')[0]!;
    expect(el.closest('.font-mono')).not.toBeNull();
  });

  it('shows an empty state without data', () => {
    render(<TextStatus data={{ label: 'Gateway status', status: 'OK', value: null, mapping: {} }} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('animation level off renders without motion', () => {
    const { container } = render(<TextStatus data={data} animation="off" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('prefers-reduced-motion forces off even when expressive', () => {
    reducedMotion(true);
    const { container } = render(<TextStatus data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'off');
  });

  it('keeps the requested animation level when motion is allowed', () => {
    reducedMotion(false);
    const { container } = render(<TextStatus data={data} animation="expressive" />);
    expect(container.firstElementChild).toHaveAttribute('data-animation', 'expressive');
  });

  it('translates to pt-BR', () => {
    renderWithLocale(<TextStatus data={{ ...data, status: 'DOWN' as const, value: 'DOWN' }} />, 'pt-BR');
    expect(screen.getAllByText('FORA').length).toBeGreaterThan(0);
    expect(screen.getByText('FORA')).toBeInTheDocument();
  });

  it('shows the empty state in pt-BR', () => {
    renderWithLocale(<TextStatus data={{ label: 'Gateway status', status: 'OK', value: null, mapping: {} }} />, 'pt-BR');
    expect(screen.getByText('Sem dados ainda')).toBeInTheDocument();
  });

  it('never renders a full card number (PCI DSS)', () => {
    const { container } = render(<TextStatus data={{ ...data, value: PAN }} />);
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.innerHTML).not.toContain('4111 1111');
    expect(container.textContent).toContain(MASKED);
  });

  it('an unmapped value is shown as neutral text, never colored', () => {
    render(<TextStatus data={{ ...data, value: 'MAINTENANCE' }} />);
    expect(screen.getByText('MAINTENANCE').closest('[data-status]')).toHaveAttribute('data-status', 'neutral');
  });
});
