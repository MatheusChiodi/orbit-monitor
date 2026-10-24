import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { APPLY_TO, canApply, scopeOf, type ApplyTo } from '@/shared/customization/changes';
import { instanceIdOf, type CustomizeModeStore } from '@/shared/customization/customizeMode';
import { settingsForTarget } from '@/shared/customization/registry';
import type { CustomizationStore } from '@/shared/customization/store';
import type { TerminologyStore } from '@/shared/customization/terminology';
import { INSPECTOR_TABS, type InspectorTab } from '@/shared/customization/types';
import { IconButton, IconClose, Tabs } from '@/shared/ui';
import { SettingField } from '../SettingField';
import { TerminologyEditor } from '../TerminologyEditor';
import { NAME_KEYS } from './nameKeys';

export interface CustomizeInspectorProps {
  store: CustomizationStore;
  mode: CustomizeModeStore;
  terminology: TerminologyStore | null;
  layoutId: string | null;
}

/** FE-53 inspector: only the settings of the selected item, by tab, with the apply-scope chooser. */
export function CustomizeInspector({ store, mode, terminology, layoutId }: CustomizeInspectorProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const selected = useStore(mode, (s) => s.selected);
  const applyTo = useStore(mode, (s) => s.applyTo);
  const state = useStore(store);
  const [tab, setTab] = useState<InspectorTab>('content');
  if (!selected) return null;

  const instanceId = instanceIdOf(selected);
  const settings = settingsForTarget(selected.type);
  const onTab = settings.filter((s) => s.tab === tab);
  const title = t('customization.mode.inspector', { name: selected.label });
  const allowed = (a: ApplyTo) =>
    (a !== 'layout' || layoutId !== null) && settings.some((s) => s.scopes.includes(scopeOf(a)) && canApply(s.id, a, s.default, instanceId, layoutId));

  return (
    <aside
      role="dialog"
      aria-labelledby={titleId}
      style={{ bottom: 'var(--customize-bar-height, 0px)' }}
      className="fixed top-0 right-0 z-40 flex w-full max-w-sm flex-col gap-3 overflow-y-auto border-l border-line bg-s1 p-4 shadow-popover"
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="section-label m-0">{t(`customization.mode.types.${selected.type === 'card.monitor' ? 'monitor' : 'group'}`)}</p>
          <h2 id={titleId} className="m-0 text-md font-semibold">
            {title}
          </h2>
        </div>
        <IconButton label={t('customization.mode.close')} icon={IconClose} onClick={() => mode.getState().select(null)} />
      </header>

      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 text-sm text-muted">{t('customization.mode.applyTo')}</legend>
        {APPLY_TO.map((a) => (
          <label key={a} className="flex items-center gap-2 text-base">
            <input className="accent-accent" type="radio" name={`${titleId}-apply`} value={a} checked={applyTo === a} disabled={!allowed(a)} onChange={() => mode.getState().setApplyTo(a)} />
            {t(`customization.scopes.${a}`)}
          </label>
        ))}
      </fieldset>

      <Tabs label={title} value={tab} onChange={setTab} items={INSPECTOR_TABS.map((id) => ({ value: id, label: t(`customization.mode.tabs.${id}`) }))} />

      <div role="tabpanel" className="flex flex-col gap-4">
        {tab === 'names' ? (
          terminology ? (
            <TerminologyEditor store={terminology} editable keys={NAME_KEYS[selected.type]} />
          ) : (
            <p className="m-0 text-sm text-muted">{t('customization.mode.nothing')}</p>
          )
        ) : onTab.length === 0 ? (
          <p className="m-0 text-sm text-muted">{t('customization.mode.nothing')}</p>
        ) : (
          onTab.map((def) => {
            const resolved = state.resolve(def.id, { instanceId, layoutId });
            return (
              <SettingField
                key={def.id}
                def={def}
                value={resolved.value}
                source={resolved.source}
                modified={false}
                onChange={(value) => mode.getState().change(def.id, value)}
                onReset={() => undefined}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}
