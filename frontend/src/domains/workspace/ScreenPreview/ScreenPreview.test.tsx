import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ScreenPreview } from './ScreenPreview';

describe('FE-18 screen previews', () => {
  it('switches between frames with a radio group', async () => {
    render(
      <ScreenPreview>
        <p>wall</p>
      </ScreenPreview>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Screen preview' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1080p (1920×1080)' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Portrait (1080×1920)' }));
    expect(screen.getByTestId('screen-frame')).toHaveAttribute('data-preset', 'portrait');
  });

  it('the frame keeps the real resolution and is scaled with a transform', () => {
    render(
      <ScreenPreview initialPreset="4k">
        <p>wall</p>
      </ScreenPreview>,
    );
    const frame = screen.getByTestId('screen-frame');
    expect(frame.style.width).toBe('3840px');
    expect(frame.style.height).toBe('2160px');
    expect(frame.style.transform).toMatch(/scale\(/);
  });

  it('renders the children inside the frame', () => {
    render(
      <ScreenPreview>
        <p>wall content</p>
      </ScreenPreview>,
    );
    expect(screen.getByText('wall content')).toBeInTheDocument();
  });

  it('labels in pt-BR', () => {
    renderWithLocale(
      <ScreenPreview>
        <p>wall</p>
      </ScreenPreview>,
      'pt-BR',
    );
    expect(screen.getByRole('radiogroup', { name: 'Pré-visualização da tela' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Retrato (1080×1920)' })).toBeInTheDocument();
  });
});
