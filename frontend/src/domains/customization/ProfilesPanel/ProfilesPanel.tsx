import { useId, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import type { CustomizationProfile } from '@/shared/customization/api';
import { BUILT_IN_PROFILES, applyProfile, duplicateProfile, exportProfile, parseProfileFile, profileFromScope, type BuiltInProfile, type ProfileTarget } from '@/shared/customization/profiles';
import type { CustomizationStore } from '@/shared/customization/store';
import { Button, INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';
import { ProfileCard } from './ProfileCard';

export interface ProfilesPanelProps {
  store: CustomizationStore;
  editable: boolean;
  layoutIds?: readonly string[];
}

type Feedback = { kind: 'ok' | 'error'; text: string } | null;

function download(text: string, name: string): void {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function readText(file: File): Promise<string> {
  return typeof file.text === 'function' ? file.text() : new Response(file).text();
}

/** FE-57: built-in and custom profiles — apply to this device or a layout, duplicate, export, import. */
export function ProfilesPanel({ store, editable, layoutIds = [] }: ProfilesPanelProps) {
  const { t } = useTranslation();
  const ids = { name: useId(), import: useId() };
  const custom = useStore(store, (s) => s.profiles);
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const displayName = (p: CustomizationProfile) => ('builtIn' in p ? t(`customization.profiles.names.${(p as BuiltInProfile).slug}`) : p.name);
  const all: CustomizationProfile[] = [...BUILT_IN_PROFILES, ...custom];

  async function apply(profile: CustomizationProfile, target: ProfileTarget) {
    await applyProfile(store, profile, target);
    const where = target.scope === 'device' ? t('customization.scopes.device') : `${t('customization.scopes.layout')} ${target.layoutId}`;
    setFeedback({ kind: 'ok', text: t('customization.profiles.applied', { name: displayName(profile), target: where }) });
  }

  async function duplicate(profile: CustomizationProfile) {
    const copy = duplicateProfile(profile, t('customization.profiles.copyOf', { name: displayName(profile) }), store.getState().profiles);
    await store.getState().saveProfile(copy);
  }

  async function saveCurrent() {
    if (!name.trim()) return;
    const profile = profileFromScope(store, name, 'device', store.getState().profiles);
    if (await store.getState().saveProfile(profile)) setName('');
  }

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = parseProfileFile(await readText(file), store.getState().profiles);
    if (!result.ok) {
      setFeedback({ kind: 'error', text: t(result.error.key, result.error.params ?? {}) });
      return;
    }
    if (await store.getState().saveProfile(result.profile)) setFeedback({ kind: 'ok', text: t('customization.profiles.imported', { name: result.profile.name }) });
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <p className="m-0 text-[0.85rem] text-muted">{t('customization.profiles.intro')}</p>
      {feedback && (
        <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={`m-0 text-[0.85rem] ${feedback.kind === 'error' ? 'text-down-text' : 'text-ok-text'}`}>
          {feedback.text}
        </p>
      )}
      <div className="grid gap-[0.8rem] md:grid-cols-2 xl:grid-cols-3">
        {all.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            name={displayName(profile)}
            builtIn={'builtIn' in profile}
            editable={editable}
            layoutIds={layoutIds}
            onApply={(target) => void apply(profile, target)}
            onDuplicate={() => void duplicate(profile)}
            onExport={() => download(exportProfile({ ...profile, name: displayName(profile) }), `orbit-profile-${profile.id.split(':')[1]}.json`)}
            onDelete={() => void store.getState().deleteProfile(profile.id)}
          />
        ))}
      </div>
      {editable && (
        <div className="flex flex-wrap items-end gap-[0.8rem]">
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.name}>{t('customization.profiles.name')}</label>
            <input id={ids.name} className={INPUT_CLASS} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button variant="primary" disabled={!name.trim()} onClick={() => void saveCurrent()}>
            {t('customization.profiles.saveCurrent')}
          </Button>
          <span className={LABEL_CLASS}>
            <label htmlFor={ids.import}>{t('customization.profiles.import')}</label>
            <input id={ids.import} type="file" accept="application/json,.json" className={`${SELECT_CLASS} py-[0.3rem]`} onChange={(e) => void onImport(e)} />
          </span>
        </div>
      )}
    </div>
  );
}
