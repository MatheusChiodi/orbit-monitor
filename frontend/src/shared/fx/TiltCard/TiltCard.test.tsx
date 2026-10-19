import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FxProvider } from '../FxProvider';
import type { FxLevel } from '../fxLevel';
import { TiltCard, tiltAngles } from './TiltCard';

function renderCard(level: FxLevel) {
  render(
    <FxProvider level={level} monitorFrames={false}>
      <TiltCard data-testid="card">content</TiltCard>
    </FxProvider>,
  );
  const card = screen.getByTestId('card');
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
  });
  return card;
}

afterEach(() => vi.restoreAllMocks());

describe('FE-52 TiltCard', () => {
  it('angles stay within the maximum, even outside the card', () => {
    const { rotateX, rotateY } = tiltAngles({ x: 1, y: 1 }, 4);
    expect(Math.abs(rotateX)).toBeLessThanOrEqual(4);
    expect(Math.abs(rotateY)).toBeLessThanOrEqual(4);
    expect(tiltAngles({ x: 9, y: -9 }, 4).rotateY).toBe(4);
    expect(tiltAngles({ x: 0.5, y: 0.5 }, 4)).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it('expressive: a mouse over the corner tilts the card up to 4 degrees with a sheen', () => {
    const card = renderCard('expressive');
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'mouse' });
    expect(card.style.transform).toContain('rotateX(4deg)');
    expect(card.style.transform).toContain('rotateY(4deg)');
    expect(card).toHaveAttribute('data-tilting', 'true');
    fireEvent.pointerLeave(card, { pointerType: 'mouse' });
    expect(card.style.transform).toBe('');
    expect(card).not.toHaveAttribute('data-tilting');
  });

  it('touch never tilts', () => {
    const card = renderCard('expressive');
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'touch' });
    expect(card.style.transform).toBe('');
  });

  it('off and minimal: no tilt', () => {
    for (const level of ['off', 'minimal'] as const) {
      const card = renderCard(level);
      fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'mouse' });
      expect(card.style.transform).toBe('');
      expect(card.className).not.toContain('fx-tilt');
      cleanup();
    }
  });

  it('is a glass surface', () => {
    expect(renderCard('standard').className).toContain('fx-glass');
  });
});
