import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomizationProfile } from '@/shared/customization/api';
import type { BuiltInProfile, ProfileTarget } from '@/shared/customization/profiles';
import { Badge, Button, SELECT_CLASS } from '@/shared/ui';

export interface ProfileCardProps {
  profile: CustomizationProfile;
  name: string;
  builtIn: boolean;
  editable: boolean;
  layoutIds: readonly string[];
  onApply: (target: ProfileTarget) => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function ProfileCard({ profile, name, builtIn, editable, layoutIds, onApply, onDuplicate, onExport, onDelete }: ProfileCardProps) {
  const { t } = useTranslation();
  const ids = { title: useId(), target: useId() };
  const [target, setTarget] = useState('device');
  const description = builtIn ? t(`customization.profiles.descriptions.${(profile as BuiltInProfile).slug}`) : profile.description;
  const count = Object.keys(profile.settings).length;
  const toTarget = (): ProfileTarget => (target.startsWith('layout:') ? { scope: 'layout', layoutId: target.slice(7) } : { scope: 'device' });
  return (
    <article aria-labelledby={ids.title} className="flex flex-col gap-[0.5rem] rounded-[0.9rem] border border-line bg-s1 p-[0.9rem]">
      <header className="flex items-center justify-between gap-[0.5rem]">
        <h3 id={ids.title} className="m-0 text-[0.95rem] font-semibold">
          {name}
        </h3>
        <Badge>{builtIn ? t('customization.profiles.builtIn') : t('customization.profiles.custom')}</Badge>
      </header>
      {description && <p className="m-0 text-[0.8rem] text-muted">{description}</p>}
      <p className="m-0 font-mono text-[0.72rem] text-dim">{t('customization.profiles.settingsCount', { count })}</p>
      {editable && (
        <div className="mt-auto flex flex-wrap items-center gap-[0.4rem]">
          <select id={ids.target} aria-label={t('customization.profiles.applyTo', { name })} className={`${SELECT_CLASS} w-auto`} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="device">{t('customization.scopes.device')}</option>
            {layoutIds.map((l) => (
              <option key={l} value={`layout:${l}`}>
                {`${t('customization.scopes.layout')}: ${l}`}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={() => onApply(toTarget())}>
            {t('customization.profiles.apply')}
          </Button>
          <Button variant="ghost" onClick={onDuplicate}>
            {t('customization.profiles.duplicate')}
          </Button>
          <Button variant="ghost" onClick={onExport}>
            {t('customization.profiles.export')}
          </Button>
          {!builtIn && (
            <Button variant="ghost" onClick={onDelete}>
              {t('customization.profiles.delete')}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
