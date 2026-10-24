import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VariablesCard, createDemoVariablesApi, createVariablesApi, workspaceReset } from '@/domains/settings/variables';
import { CustomizationScreen } from '@/domains/customization/CustomizationScreen';
import { CustomizeToggle } from '@/domains/customization/CustomizeToggle';
import { DevicePreferences } from '@/domains/workspace/DevicePreferences';
import { MotionSettingsPanel } from '@/domains/workspace/MotionSettingsPanel';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { systemPrefersReducedMotion } from '@/shared/motion/animationLevel';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { Card } from '@/shared/ui';
import { WallSoundCard } from './WallSoundCard';
import { WorkspaceResetCard } from './WorkspaceResetCard';

export interface AdvancedSettingsProps {
  preferences: PreferencesStore;
  editable: boolean;
  /** Demo mode never calls the API: variables stay in memory and the reset only clears local state. */
  demo?: boolean;
}

/**
 * FE-72 Settings › Advanced: Customize mode, this device (viewing distance, preferences file), wall sound,
 * motion details, variables, every registry setting with profiles and terminology, and the workspace reset.
 */
export function AdvancedSettings({ preferences, editable, demo = false }: AdvancedSettingsProps) {
  const { t } = useTranslation();
  const { mode, store, terminology } = useCustomization();
  const variables = useMemo(() => (demo ? createDemoVariablesApi() : createVariablesApi()), [demo]);
  const afterReset = () => {
    preferences.getState().setWorkspaceDefaults({});
    void store.getState().load();
    void terminology?.getState().load();
  };
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
      <VariablesCard api={variables} demo={demo} editable={editable} />
      <Card>
        <CustomizationScreen editable={editable} />
      </Card>
      {editable && <WorkspaceResetCard reset={demo ? () => Promise.resolve() : () => workspaceReset()} onDone={afterReset} />}
    </div>
  );
}
