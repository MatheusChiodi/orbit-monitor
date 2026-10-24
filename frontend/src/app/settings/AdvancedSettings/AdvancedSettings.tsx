import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomizationScreen } from '@/domains/customization/CustomizationScreen';
import { CustomizeToggle } from '@/domains/customization/CustomizeToggle';
import { DevicePreferences } from '@/domains/workspace/DevicePreferences';
import { MotionSettingsPanel } from '@/domains/workspace/MotionSettingsPanel';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { systemPrefersReducedMotion } from '@/shared/motion/animationLevel';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { Card } from '@/shared/ui';
import { WallSoundCard } from './WallSoundCard';

export interface AdvancedSettingsProps {
  preferences: PreferencesStore;
  editable: boolean;
}

/**
 * FE-72 Settings › Advanced: Customize mode, this device (viewing distance, preferences file), wall sound,
 * motion details and every registry setting with profiles and terminology.
 */
export function AdvancedSettings({ preferences, editable }: AdvancedSettingsProps) {
  const { t } = useTranslation();
  const { mode } = useCustomization();
  const [reducedMotion] = useState(systemPrefersReducedMotion);
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-muted">{t('settingsHub.advanced.intro')}</p>
      <Card title={t('settingsHub.advanced.customize')}>
        {mode ? (
          <CustomizeToggle variant="switch" description={t('settingsHub.advanced.customizeHint')} />
        ) : (
          <p className="m-0 text-sm text-muted">{t('settingsHub.advanced.customizeViewOnly')}</p>
        )}
      </Card>
      <DevicePreferences store={preferences} />
      <WallSoundCard />
      <MotionSettingsPanel store={preferences} reducedMotion={reducedMotion} />
      <Card>
        <CustomizationScreen editable={editable} />
      </Card>
    </div>
  );
}
