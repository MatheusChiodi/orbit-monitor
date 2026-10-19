import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';

export interface SoundToggleProps {
  muted: boolean;
  onChange: (muted: boolean) => void;
}

/** Pressed-state toggle with its state written as text ("Muted" / "Sound on"). */
export function SoundToggle({ muted, onChange }: SoundToggleProps) {
  const { t } = useTranslation();
  const labelId = useId();
  return (
    <span className="inline-flex items-center gap-[0.4rem]">
      <span id={labelId} className="sr-only">
        {t('sound.label')}
      </span>
      <Button variant="ghost" aria-labelledby={labelId} aria-pressed={!muted} onClick={() => onChange(!muted)}>
        {muted ? t('sound.muted') : t('sound.on')}
      </Button>
    </span>
  );
}
