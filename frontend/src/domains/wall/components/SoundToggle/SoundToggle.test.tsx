import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SoundToggle } from './SoundToggle';

describe('FE-47 sound toggle', () => {
  it('is a pressed-state button labelled in text, muted by default', () => {
    render(<SoundToggle muted onChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Sound alerts' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('Sound off');
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('shows the state it is in, with its own icon', () => {
    const { rerender } = render(<SoundToggle muted onChange={vi.fn()} />);
    const off = screen.getByRole('button', { name: 'Sound alerts' }).querySelector('svg')?.dataset.icon;
    rerender(<SoundToggle muted={false} onChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Sound alerts' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Sound on');
    expect(button.querySelector('svg')?.dataset.icon).not.toBe(off);
  });

  it('toggles with the keyboard', async () => {
    const onChange = vi.fn();
    render(<SoundToggle muted onChange={onChange} />);
    screen.getByRole('button', { name: 'Sound alerts' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<SoundToggle muted={false} onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Alertas sonoros' })).toHaveTextContent('Som ligado');
  });
});
