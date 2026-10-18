import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { StatusDot, StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('always shows the state label (never color alone)', () => {
    render(<StatusPill status="DOWN" />);
    expect(screen.getByText('DOWN')).toBeInTheDocument();
  });

  it('translates the label to pt-BR', () => {
    renderWithLocale(<StatusPill status="DOWN" />, 'pt-BR');
    expect(screen.getByText('FORA')).toBeInTheDocument();
  });

  it('accepts custom text', () => {
    render(<StatusPill status="OK">All systems operational</StatusPill>);
    expect(screen.getByText('All systems operational')).toBeInTheDocument();
  });

  it('the dot blinks only in red', () => {
    const { rerender, container } = render(<StatusPill status="DOWN" />);
    expect(container.querySelector('.anim-blink')).not.toBeNull();
    rerender(<StatusPill status="WARN" />);
    expect(container.querySelector('.anim-blink')).toBeNull();
  });

  it('exposes data-status', () => {
    render(<StatusPill status="WARN" />);
    expect(screen.getByText('WARNING').closest('[data-status]')).toHaveAttribute('data-status', 'WARN');
  });
});

describe('StatusDot', () => {
  it('has an accessible state label in both languages', () => {
    render(<StatusDot status="DOWN" />);
    expect(screen.getByRole('img', { name: 'DOWN' })).toBeInTheDocument();
    renderWithLocale(<StatusDot status="WARN" />, 'pt-BR');
    expect(screen.getByRole('img', { name: 'ATENÇÃO' })).toBeInTheDocument();
  });
  it('blinks when asked', () => {
    const { container } = render(<StatusDot status="DOWN" blink />);
    expect(container.querySelector('.anim-blink')).not.toBeNull();
  });
});
