import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { StatusBadge } from './StatusBadge';

describe('FE-61 StatusBadge', () => {
  it('renders a dot and the status word in sentence case', () => {
    render(<StatusBadge status="WARN" />);
    const badge = screen.getByText('Warning').closest('[data-status]')!;
    expect(badge).toHaveAttribute('data-status', 'WARN');
    expect(badge.querySelector('[data-dot]')).toHaveClass('bg-warn');
  });

  it('is translated', () => {
    renderWithLocale(<StatusBadge status="DOWN" />, 'pt-BR');
    expect(screen.getByText('Fora')).toBeInTheDocument();
  });

  it('only Down pulses', () => {
    const { container, rerender } = render(<StatusBadge status="DOWN" />);
    expect(container.querySelector('[data-dot]')).toHaveClass('anim-blink');
    rerender(<StatusBadge status="OK" />);
    expect(container.querySelector('[data-dot]')).not.toHaveClass('anim-blink');
  });

  it('accepts a custom label and the neutral and info tones', () => {
    render(
      <>
        <StatusBadge status="neutral">Paused</StatusBadge>
        <StatusBadge status="INFO" />
      </>,
    );
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });
});
