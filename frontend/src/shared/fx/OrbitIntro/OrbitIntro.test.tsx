import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { FxProvider } from '../FxProvider';
import type { FxLevel } from '../fxLevel';
import { OrbitIntro } from './OrbitIntro';

const player = vi.fn();

// The real IntroPlayer pulls Remotion and three; a light stand-in keeps the lazy import instant and
// deterministic under a full parallel run. Its props are covered by introProps.test.ts.
vi.mock('./IntroPlayer', async () => {
  const { useTranslation } = await import('react-i18next');
  const { introProps, readPalette } = await import('./introProps');
  return {
    IntroPlayer: ({ id }: { id: 'check-flow' }) => {
      const { t } = useTranslation();
      const props = { autoPlay: true, inputProps: introProps(id, t, readPalette()) };
      player(props);
      return <div data-testid="remotion-player" data-autoplay="true" />;
    },
  };
});

function renderIntro(level: FxLevel) {
  return render(
    <FxProvider level={level} monitorFrames={false}>
      <OrbitIntro id="check-flow" />
    </FxProvider>,
  );
}

// Resolve the lazy chunk once up front, so no test depends on how fast a dynamic import is under load.
beforeAll(async () => {
  await import('./IntroPlayer');
}, 30_000);

afterEach(() => player.mockClear());

describe('FE-52 OrbitIntro', () => {
  it('off and minimal: no intro at all', () => {
    for (const level of ['off', 'minimal'] as const) {
      const { container, unmount } = renderIntro(level);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(player).not.toHaveBeenCalled();
  });

  it('standard: a poster with a play button; Remotion loads only after the click', async () => {
    renderIntro('standard');
    expect(screen.getByRole('figure', { name: 'Animated introduction' })).toBeInTheDocument();
    expect(player).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Play intro' }));
    expect(await screen.findByTestId('remotion-player')).toHaveAttribute('data-autoplay', 'true');
  });

  it('expressive: the composition autoplays with translated props', async () => {
    renderIntro('expressive');
    expect(await screen.findByTestId('remotion-player')).toHaveAttribute('data-autoplay', 'true');
    expect(player.mock.calls[0]?.[0].inputProps.heading).toBe('How a check flows');
  });

  it('pt-BR: the play button and the composition text are translated', async () => {
    renderWithLocale(
      <FxProvider level="standard" monitorFrames={false}>
        <OrbitIntro id="check-flow" />
      </FxProvider>,
      'pt-BR',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ver introdução' }));
    await screen.findByTestId('remotion-player');
    expect(player.mock.calls[0]?.[0].inputProps.heading).toBe('Como uma checagem flui');
  });
});
