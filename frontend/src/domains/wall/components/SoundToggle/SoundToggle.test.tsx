import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SoundToggle } from './SoundToggle';

describe('FE-47 sound toggle', () => {
  it('is a switch named by its visible text, off by default, with a speaker icon', () => {
    render(<SoundToggle muted onChange={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'Sound alerts' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveTextContent('Sound alerts');
    expect(toggle.querySelector('svg')?.dataset.icon).toBe('sound-off');
  });

  it('shows the state it is in, with its own icon', () => {
    render(<SoundToggle muted={false} onChange={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'Sound alerts' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle.querySelector('svg')?.dataset.icon).toBe('sound-on');
  });

  it('toggles with the keyboard', async () => {
    const onChange = vi.fn();
    render(<SoundToggle muted onChange={onChange} />);
    screen.getByRole('switch', { name: 'Sound alerts' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<SoundToggle muted={false} onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('switch', { name: 'Alertas sonoros' })).toHaveAttribute('aria-checked', 'true');
  });
});
