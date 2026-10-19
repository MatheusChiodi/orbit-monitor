import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readFxPalette, useFxPalette } from './palette';

const root = document.documentElement;

afterEach(() => {
  for (const name of ['--fx-from', '--fx-to', '--fx-glow', '--info', '--ok']) root.style.removeProperty(name);
});

function Probe() {
  const palette = useFxPalette();
  return <span data-testid="p">{`${palette.from} ${palette.to} ${palette.glow}`}</span>;
}

describe('FE-52 FX palette from the theme tokens', () => {
  it('uses the theme fx tokens (from / to / glow) when the theme sets them', () => {
    root.style.setProperty('--fx-from', '#111111');
    root.style.setProperty('--fx-to', '#222222');
    root.style.setProperty('--fx-glow', '#333333');
    expect(readFxPalette()).toMatchObject({ from: '#111111', to: '#222222', glow: '#333333' });
  });

  it('falls back to info / ok, then to the Orbit Dark defaults', () => {
    root.style.setProperty('--info', '#0000ff');
    root.style.setProperty('--ok', '#00ff00');
    expect(readFxPalette()).toMatchObject({ from: '#0000ff', to: '#00ff00', glow: '#0000ff' });
    root.style.removeProperty('--info');
    root.style.removeProperty('--ok');
    expect(readFxPalette()).toMatchObject({ from: '#3b9eff', to: '#22c55e', down: '#ff3b4f' });
  });

  it('re-reads when the theme rewrites the variables on <html>', async () => {
    render(<Probe />);
    expect(screen.getByTestId('p')).toHaveTextContent('#3b9eff #22c55e #3b9eff');
    await act(async () => {
      root.style.setProperty('--fx-from', '#abcdef');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByTestId('p')).toHaveTextContent('#abcdef');
  });
});
