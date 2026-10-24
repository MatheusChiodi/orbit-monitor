import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { Tabs, type TabItem } from '@/shared/ui';
import { ProfilesPanel } from '../ProfilesPanel';
import { SettingsEditor } from '../SettingsEditor';
import { TerminologyEditor } from '../TerminologyEditor';

export interface CustomizationScreenProps {
  editable: boolean;
}

type Tab = 'settings' | 'names' | 'profiles';

/** Settings › Advanced: every registry setting (CORE-21), names and terms (FE-54) and profiles (FE-57). */
export function CustomizationScreen({ editable }: CustomizationScreenProps) {
  const { t } = useTranslation();
  const { store, terminology } = useCustomization();
  const layoutIds = useStore(store, (s) => s.layoutIds);
  const [tab, setTab] = useState<Tab>('settings');
  const items: TabItem<Tab>[] = [
    {
      value: 'settings',
      label: t('settingsHub.advanced.registry'),
      content: (
        <div className="flex flex-col gap-4">
          <p className="m-0 max-w-2xl text-sm text-muted">{t('settingsHub.advanced.registryHint')}</p>
          <SettingsEditor store={store} editable={editable} layoutIds={layoutIds} />
        </div>
      ),
    },
    ...(terminology
      ? [{ value: 'names' as const, label: t('settingsHub.advanced.terminology'), content: <TerminologyEditor store={terminology} editable={editable} /> }]
      : []),
    { value: 'profiles', label: t('settingsHub.advanced.profiles'), content: <ProfilesPanel store={store} editable={editable} layoutIds={layoutIds} /> },
  ];
  return <Tabs label={t('settingsHub.nav.advanced')} items={items} value={tab} onChange={setTab} />;
}
