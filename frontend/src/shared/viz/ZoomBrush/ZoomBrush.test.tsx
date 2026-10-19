import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ZoomBrush } from './ZoomBrush';

const available = { from: new Date(2026, 9, 18, 16, 0).toISOString(), to: new Date(2026, 9, 18, 17, 0).toISOString() };

describe('FE-27 zoom brush', () => {
  it('has two keyboard handles for the start and end of the range', () => {
    render(<ZoomBrush available={available} value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('slider', { name: 'Zoom start' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Zoom end' })).toBeInTheDocument();
  });

  it('arrow keys move a handle by 5 minutes and report the new range', async () => {
    const onChange = vi.fn();
    render(<ZoomBrush available={available} value={null} onChange={onChange} />);
    screen.getByRole('slider', { name: 'Zoom start' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith({ from: new Date(2026, 9, 18, 16, 5).toISOString(), to: available.to });
  });

  it('shows the zoomed range and a reset button', async () => {
    const onChange = vi.fn();
    const value = { from: new Date(2026, 9, 18, 16, 10).toISOString(), to: new Date(2026, 9, 18, 16, 40).toISOString() };
    render(<ZoomBrush available={available} value={value} onChange={onChange} />);
    expect(screen.getByText('Showing 16:10–16:40')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('states the history window it can zoom into', () => {
    render(<ZoomBrush available={available} historyHours={24} value={null} onChange={vi.fn()} />);
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ZoomBrush available={available} value={null} onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('slider', { name: 'Início do zoom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restaurar zoom' })).toBeInTheDocument();
  });
});
