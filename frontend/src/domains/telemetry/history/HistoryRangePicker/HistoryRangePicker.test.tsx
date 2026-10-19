import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { presetRange } from '../range';
import { HistoryRangePicker } from './HistoryRangePicker';

const NOW = new Date('2026-10-18T12:00:00Z');
const DAY = 86_400_000;

describe('FE-58 history range picker', () => {
  it('offers 24 h, 7 d, 30 d and custom as a radio group with the current one checked', () => {
    render(<HistoryRangePicker value={presetRange('24h', NOW)} onChange={() => {}} now={() => NOW} />);
    const group = screen.getByRole('radiogroup', { name: 'History period' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['24 h', '7 d', '30 d', 'Custom']);
    expect(screen.getByRole('radio', { name: '24 h' })).toHaveAttribute('aria-checked', 'true');
  });

  it('choosing a preset reports the period ending now', async () => {
    const onChange = vi.fn();
    render(<HistoryRangePicker value={presetRange('24h', NOW)} onChange={onChange} now={() => NOW} />);
    await userEvent.click(screen.getByRole('radio', { name: '30 d' }));
    expect(onChange).toHaveBeenCalledWith({ preset: '30d', from: new Date(NOW.getTime() - 30 * DAY), to: NOW });
  });

  it('arrow keys move the selection like a radio group', async () => {
    const onChange = vi.fn();
    render(<HistoryRangePicker value={presetRange('24h', NOW)} onChange={onChange} now={() => NOW} />);
    screen.getByRole('radio', { name: '24 h' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '7 d' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '7 d' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ preset: '7d' }));
  });

  it('a custom period is validated before it is applied', async () => {
    const onChange = vi.fn();
    render(<HistoryRangePicker value={presetRange('24h', NOW)} onChange={onChange} now={() => NOW} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-01T00:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01T00:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at most 31 days');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-20T00:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ preset: 'custom' }));
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<HistoryRangePicker value={presetRange('7d', NOW)} onChange={() => {}} now={() => NOW} />, 'pt-BR');
    expect(screen.getByRole('radiogroup', { name: 'Período do histórico' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Personalizado' })).toBeInTheDocument();
  });
});
