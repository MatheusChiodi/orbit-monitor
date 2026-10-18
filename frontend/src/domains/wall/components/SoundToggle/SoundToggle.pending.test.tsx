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
    expect(button).toHaveTextContent('Muted');
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
