import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { IconSoundOff, IconSoundOn } from '../WallIcons';

export interface SoundToggleProps {
  muted: boolean;
  onChange: (muted: boolean) => void;
}

/**
 * A switch, not a status word: speaker icon, the visible name "Sound alerts" (which is also its accessible
 * name, WCAG 2.5.3) and a small track that reads on/off from across the room.
 */
export function SoundToggle({ muted, onChange }: SoundToggleProps) {
  const { t } = useTranslation();
  const on = !muted;
  return (
    <Button
      variant="ghost"
      size="sm"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(on)}
      className={on ? 'text-text' : 'text-muted'}
    >
      {on ? <IconSoundOn /> : <IconSoundOff />}
      {t('sound.label')}
      <span
        aria-hidden
        data-on={on}
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors ${
          on ? 'border-accent bg-accent' : 'border-line-2 bg-s3'
        }`}
      >
        <span className={`absolute size-3 rounded-full transition-transform ${on ? 'translate-x-3.5 bg-on-accent' : 'translate-x-0.5 bg-muted'}`} />
      </span>
    </Button>
  );
}
