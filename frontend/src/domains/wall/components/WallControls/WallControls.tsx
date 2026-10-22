import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isOptedIn, optIn, optOut } from '@/domains/alerting/desktopNotifications';
import { Button } from '@/shared/ui';
import type { SoundSettings } from '../../sound';
import { SoundToggle } from '../SoundToggle';

export interface WallControlsProps {
  sound: SoundSettings;
  onSoundChange: (sound: SoundSettings) => void;
  /** FE-19: position in the layout playlist, and whether it is held by an unacknowledged incident. */
  playlist?: { index: number; total: number; paused: boolean } | null;
}

/** Header controls of the wall runtime: sound alerts (FE-47) and desktop notifications (FE-48). */
export function WallControls({ sound, onSoundChange, playlist = null }: WallControlsProps) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(isOptedIn);
  const [denied, setDenied] = useState(false);

  async function toggleNotifications() {
    if (notifications) {
      optOut();
      setNotifications(false);
      return;
    }
    const granted = await optIn();
    setNotifications(granted);
    setDenied(!granted);
  }

  return (
    <span className="inline-flex items-center gap-[0.4rem]">
      {playlist && (
        <span role="status" className={`font-mono text-[0.75rem] ${playlist.paused ? 'text-warn-text' : 'text-muted'}`}>
          {playlist.paused ? t('wall.playlist.paused') : t('wall.playlist.position', { index: playlist.index + 1, total: playlist.total })}
        </span>
      )}
      <SoundToggle muted={sound.muted} onChange={(muted) => onSoundChange({ ...sound, muted })} />
      <Button variant="ghost" onClick={() => void toggleNotifications()}>
        {notifications ? t('desktopNotifications.disable') : t('desktopNotifications.enable')}
      </Button>
      {denied && <span className="text-[0.75rem] text-warn-text">{t('desktopNotifications.denied')}</span>}
    </span>
  );
}
