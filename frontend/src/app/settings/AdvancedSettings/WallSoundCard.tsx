import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadSoundSettings, saveSoundSettings, type SoundSettings } from '@/domains/wall/sound';
import { Card, Checkbox, Switch } from '@/shared/ui';

/** FE-47 wall sound for this browser (same `orbit.sound` device setting the wall reads). */
export function WallSoundCard() {
  const { t } = useTranslation();
  const volumeId = useId();
  const [sound, setSound] = useState<SoundSettings>(loadSoundSettings);
  const update = (next: SoundSettings) => {
    setSound(next);
    saveSoundSettings(next);
  };
  return (
    <Card title={t('settingsHub.advanced.sound')} description={t('settingsHub.advanced.soundHint')}>
      <Switch label={t('settingsHub.advanced.soundOn')} checked={!sound.muted} onCheckedChange={(on) => update({ ...sound, muted: !on })} />
      <div className="flex max-w-md flex-col gap-1.5">
        <label htmlFor={volumeId} className="text-sm font-medium text-muted">
          {t('settingsHub.advanced.volume')}
        </label>
        <input
          id={volumeId}
          type="range"
          min={0}
          max={1}
          step={0.05}
          disabled={sound.muted}
          value={sound.volume}
          aria-valuetext={`${Math.round(sound.volume * 100)} %`}
          onChange={(e) => update({ ...sound, volume: Number(e.target.value) })}
          className="w-full accent-accent disabled:opacity-50"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Checkbox
          label={t('settingsHub.advanced.soundDown')}
          disabled={sound.muted}
          checked={sound.severities.DOWN}
          onChange={(e) => update({ ...sound, severities: { ...sound.severities, DOWN: e.target.checked } })}
        />
        <Checkbox
          label={t('settingsHub.advanced.soundWarn')}
          disabled={sound.muted}
          checked={sound.severities.WARN}
          onChange={(e) => update({ ...sound, severities: { ...sound.severities, WARN: e.target.checked } })}
        />
      </div>
    </Card>
  );
}
