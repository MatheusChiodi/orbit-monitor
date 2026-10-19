import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
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
  const player = useRef<PlayerRef>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const onEnded = () => setEnded(true);
    current.addEventListener('ended', onEnded);
    return () => current.removeEventListener('ended', onEnded);
  }, []);

  const replay = () => {
    setEnded(false);
    player.current?.seekTo(0);
    player.current?.play();
  };

  return (
    <div className="relative">
    <Player
      ref={player}
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
      // Rest on the final frame so the intro ends on its message.
      moveToBeginningWhenEnded={false}
      numberOfSharedAudioTags={0}
      style={{ width: '100%', aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    />
      {ended && (
        <button
          type="button"
          onClick={replay}
          className="absolute right-[0.6rem] bottom-[0.6rem] rounded-full border border-line-2 bg-s2/80 px-[0.8rem] py-[0.35rem] text-[0.8rem] text-text hover:bg-s3 active:scale-[0.98]"
        >
          {t('fx.intro.replay')}
        </button>
      )}
    </div>
  );
}
