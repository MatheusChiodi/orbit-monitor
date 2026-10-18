import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { VisualizationPicker } from './VisualizationPicker';

const PAN = '4111 1111 1111 1111';
const MASKED = '•••• •••• •••• 1111';

const field = { field: 'PENDING_QTY', label: 'Pending' };
const data = {
  label: 'Pending',
  unit: 'QTY',
  status: 'WARN' as const,
  value: 160,
  min: 0,
  max: 250,
  rule: { field: 'QTY', operator: '<' as const, limit: 200 },
  historyHours: 24,
  points: [
    { at: '2026-10-18T17:00:00Z', value: 120 },
    { at: '2026-10-18T17:01:00Z', value: 160 },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FE-21 visualization picker', () => {
  it('is a radio group named after the field', () => {
    render(<VisualizationPicker field={field} data={data} onSelect={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: 'Choose how to show Pending' })).toBeInTheDocument();
  });

  it('renders the real data in every compatible mode side by side', () => {
    render(<VisualizationPicker field={field} data={data} onSelect={vi.fn()} />);
    const options = screen.getAllByRole('radio');
    expect(options.length).toBeGreaterThan(3);
    for (const option of options.filter((o) => !o.hasAttribute('disabled'))) {
      expect(within(option.closest('[data-mode]')!).getAllByText(/160/).length).toBeGreaterThan(0);
    }
  });

  it('marks the suggested mode', () => {
    render(<VisualizationPicker field={field} data={data} onSelect={vi.fn()} />);
    const suggested = screen.getByText('Suggested').closest('[data-mode]');
    expect(suggested).toHaveAttribute('data-mode', 'headroom-bar');
  });

  it('incompatible modes are disabled and say why', () => {
    render(<VisualizationPicker field={field} data={data} onSelect={vi.fn()} />);
    const donut = screen.getByRole('radio', { name: /Donut/ });
    expect(donut).toBeDisabled();
    expect(donut.closest('[data-mode]')).toHaveTextContent('Needs categories');
  });

  it('clicking a preview selects that mode', async () => {
    const onSelect = vi.fn();
    render(<VisualizationPicker field={field} data={data} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('radio', { name: /Radial gauge/ }));
    expect(onSelect).toHaveBeenCalledWith('radial-gauge');
  });

  it('works with the keyboard (arrows move, the selection follows)', async () => {
    const onSelect = vi.fn();
    render(<VisualizationPicker field={field} data={data} selected="big-number" onSelect={onSelect} />);
    screen.getByRole('radio', { name: /Big number/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('radial-gauge');
  });

  it('shows the current selection as checked', () => {
    render(<VisualizationPicker field={field} data={data} selected="line" onSelect={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Line chart/ })).toBeChecked();
  });

  it('previews never animate (many charts on one screen)', () => {
    const { container } = render(<VisualizationPicker field={field} data={data} onSelect={vi.fn()} />);
    const animated = [...container.querySelectorAll('[data-animation]')].filter((el) => el.getAttribute('data-animation') !== 'off');
    expect(animated).toHaveLength(0);
  });

  it('time-based previews state the in-memory history window', () => {
    render(<VisualizationPicker field={field} data={data} onSelect={vi.fn()} />);
    expect(screen.getAllByText('History available: last 24 h').length).toBeGreaterThan(0);
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<VisualizationPicker field={field} data={data} onSelect={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('radiogroup', { name: 'Escolha como mostrar Pending' })).toBeInTheDocument();
    expect(screen.getByText('Sugerido')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Medidor radial/ })).toBeInTheDocument();
  });

  it('a card number in the data never reaches the DOM (PCI DSS)', () => {
    const { container } = render(
      <VisualizationPicker field={{ field: 'CARD', label: 'Card' }} data={{ label: 'Card', status: 'OK', value: PAN }} onSelect={vi.fn()} />,
    );
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.innerHTML).not.toContain(PAN.replace(/ /g, ''));
    expect(container.textContent).toContain(MASKED);
  });

  it('card fields offer no wall placement and explain it', () => {
    render(
      <VisualizationPicker
        field={{ field: 'CARD', label: 'Card' }}
        data={{ label: 'Card', status: 'OK', value: PAN, dataClass: 'PCI_PAN' }}
        surface="wall"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryAllByRole('radio').filter((r) => !r.hasAttribute('disabled'))).toHaveLength(0);
    expect(screen.getByText('Card data is always masked (PCI DSS)')).toBeInTheDocument();
  });

  it('without data shows an empty state instead of previews', () => {
    render(<VisualizationPicker field={field} data={{ label: 'Pending', status: 'OK', value: null }} onSelect={vi.fn()} />);
    expect(screen.getByText('Run the preview to compare visualizations')).toBeInTheDocument();
  });
});
