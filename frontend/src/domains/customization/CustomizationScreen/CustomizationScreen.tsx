import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { Button } from '@/shared/ui';
import { useStore } from 'zustand';
import { ProfilesPanel } from '../ProfilesPanel';
import { SettingsEditor } from '../SettingsEditor';
import { TerminologyEditor } from '../TerminologyEditor';

export interface CustomizationScreenProps {
  editable: boolean;
}

type Tab = 'settings' | 'names' | 'profiles';

/** `#/settings/customization`: generated settings (CORE-21), terminology (FE-54) and profiles (FE-57). */
export function CustomizationScreen({ editable }: CustomizationScreenProps) {
  const { t } = useTranslation();
  const { store, terminology } = useCustomization();
  const layoutIds = useStore(store, (s) => s.layoutIds);
  const [tab, setTab] = useState<Tab>('settings');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'settings', label: t('customization.title') },
    ...(terminology ? [{ id: 'names' as const, label: t('customization.terminology.title') }] : []),
    { id: 'profiles', label: t('customization.profiles.title') },
  ];
  return (
    <div className="flex flex-col gap-[1rem]">
      <p className="m-0 max-w-[60rem] text-[0.88rem] text-muted">{t('customization.intro')}</p>
      <div role="tablist" aria-label={t('customization.title')} className="flex flex-wrap gap-[0.4rem] border-b border-line pb-[0.4rem]">
        {tabs.map((item) => (
          <Button key={item.id} role="tab" variant={tab === item.id ? 'neutral' : 'ghost'} aria-selected={tab === item.id} onClick={() => setTab(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'names' && terminology ? (
          <TerminologyEditor store={terminology} editable={editable} />
        ) : tab === 'profiles' ? (
          <ProfilesPanel store={store} editable={editable} layoutIds={layoutIds} />
        ) : (
          <SettingsEditor store={store} editable={editable} layoutIds={layoutIds} />
        )}
      </div>
    </div>
  );
}
