import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithMotion } from '@/test/motion';
import { Button } from './Button';

describe('FE-51 Button motion', () => {
  it('standard: hover/press/focus use the 120 ms instant token', () => {
    renderWithMotion(<Button>Acknowledge</Button>, 'standard');
    const button = screen.getByRole('button', { name: 'Acknowledge' });
    expect(button).toHaveAttribute('data-motion', 'press');
    expect(button).toHaveAttribute('data-motion-level', 'standard');
    expect(button.className).toContain('duration-[120ms]');
    expect(button.className).not.toContain('transition-none');
  });

  it('off: no transition at all', () => {
    renderWithMotion(<Button>Acknowledge</Button>, 'off');
    const button = screen.getByRole('button', { name: 'Acknowledge' });
    expect(button).toHaveAttribute('data-motion-level', 'off');
    expect(button.className).toContain('transition-none');
  });

  it('minimal keeps color transitions but no press scale', () => {
    renderWithMotion(<Button>Ok</Button>, 'minimal');
    const button = screen.getByRole('button', { name: 'Ok' });
    expect(button.className).not.toContain('active:scale-[.98]');
    expect(button.className).not.toContain('transition-none');
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<Button>Ok</Button>, 'expressive', 'en', { reducedMotion: true });
    const button = screen.getByRole('button', { name: 'Ok' });
    expect(button).toHaveAttribute('data-motion-level', 'off');
    expect(button.className).toContain('transition-none');
  });
});
