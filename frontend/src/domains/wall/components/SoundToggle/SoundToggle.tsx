import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { IconSoundOff, IconSoundOn } from '../WallIcons';

export interface SoundToggleProps {
  muted: boolean;
  onChange: (muted: boolean) => void;
}

/** Pressed-state toggle: a speaker icon and its state in words ("Sound off" / "Sound on"). */
export function SoundToggle({ muted, onChange }: SoundToggleProps) {
  const { t } = useTranslation();
  const labelId = useId();
  return (
    <span className="inline-flex items-center">
      <span id={labelId} className="sr-only">
        {t('sound.label')}
      </span>
      <Button
        variant="ghost"
        size="sm"
        aria-labelledby={labelId}
        aria-pressed={!muted}
        onClick={() => onChange(!muted)}
        className={muted ? 'text-muted' : 'text-text'}
      >
        {muted ? <IconSoundOff /> : <IconSoundOn />}
        {muted ? t('sound.muted') : t('sound.on')}
      </Button>
    </span>
  );
}
