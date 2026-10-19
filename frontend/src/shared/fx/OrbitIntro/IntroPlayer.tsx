import { useMemo, type ComponentType } from 'react';
import { Player } from '@remotion/player';
import { useTranslation } from 'react-i18next';
import { FPS, HEIGHT, INTROS, WIDTH, type IntroId } from '../../../../remotion/compositions/registry';
import { introProps, readPalette } from './introProps';

export interface IntroPlayerProps {
  id: IntroId;
}

/** Remotion Player for one composition. Lives in its own chunk with Remotion and three. */
export function IntroPlayer({ id }: IntroPlayerProps) {
  const { t } = useTranslation();
  const intro = INTROS[id];
  const inputProps = useMemo(() => introProps(id, t, readPalette()), [id, t]);
  return (
    <Player
      // The registry pairs each component with its own props type; the Player API takes them loosely.
      component={intro.component as ComponentType<typeof inputProps>}
      inputProps={inputProps}
      durationInFrames={intro.durationInFrames}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      autoPlay
      initiallyMuted
      controls={false}
      clickToPlay={false}
      style={{ width: '100%', aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    />
  );
}
