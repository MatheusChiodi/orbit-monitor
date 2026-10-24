import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { settingLabel } from '@/shared/customization/labels';
import { SETTINGS } from '@/shared/customization/registry';
import type { CustomizationStore } from '@/shared/customization/store';
import { CATEGORIES, type Scope, type SettingDefinition } from '@/shared/customization/types';
import { Button, Card, Checkbox, Field, Select, TextInput } from '@/shared/ui';
import { JsonSettingsView } from '../JsonSettingsView';
import { SettingField } from '../SettingField';

export interface SettingsEditorProps {
  store: CustomizationStore;
  /** View-only clients see the values but cannot change them (docs/07 §7). */
  editable: boolean;
  /** Wall layouts that can hold layout-scoped values. */
  layoutIds?: readonly string[];
}

type EditableScope = Exclude<Scope, 'instance'>;

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** CORE-21: Settings UI generated from the registry — search, categories, modified filter, resets and JSON view. */
export function SettingsEditor({ store, editable, layoutIds = [] }: SettingsEditorProps) {
  const { t } = useTranslation();
  const ids = { scope: useId(), layout: useId() };
  const state = useStore(store);
  const [scope, setScope] = useState<EditableScope>('device');
  const [layoutId, setLayoutId] = useState<string | null>(layoutIds[0] ?? null);
  const [query, setQuery] = useState('');
  const [modifiedOnly, setModifiedOnly] = useState(false);
  const [json, setJson] = useState(false);

  const target = scope === 'layout' ? layoutId : null;
  const stored = state.valuesAt(scope, target);
  const modified = new Set(state.modified(scope, target));
  const needle = normalize(query.trim());
  const scopes: EditableScope[] = layoutIds.length > 0 ? ['device', 'workspace', 'layout'] : ['device', 'workspace'];
  const scopeLabel = t(`customization.scopes.${scope}`);

  const matches = (def: SettingDefinition) =>
    def.scopes.includes(scope) &&
    (!modifiedOnly || modified.has(def.id)) &&
    (!needle || normalize(`${settingLabel(t, def)} ${def.id}`).includes(needle));
  const sections = CATEGORIES.map((category) => ({ category, settings: SETTINGS.filter((s) => s.category === category && matches(s)) })).filter((s) => s.settings.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {!editable && <p className="m-0 text-sm text-warn-text">{t('customization.editor.viewOnly')}</p>}
      {state.error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {t(state.error.key, state.error.params ?? {})}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('customization.editor.scope')} id={ids.scope} className="w-full max-w-56">
          <Select value={scope} onChange={(e) => setScope(e.target.value as EditableScope)}>
            {scopes.map((s) => (
              <option key={s} value={s}>
                {t(`customization.scopes.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        {scope === 'layout' && (
          <Field label={t('customization.editor.layout')} id={ids.layout} className="w-full max-w-56">
            <Select value={layoutId ?? ''} onChange={(e) => setLayoutId(e.target.value)}>
              {layoutIds.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <TextInput
          type="search"
          aria-label={t('customization.editor.search')}
          placeholder={t('customization.editor.search')}
          className="max-w-xs min-w-48 flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Checkbox label={t('customization.editor.modifiedOnly')} checked={modifiedOnly} onChange={(e) => setModifiedOnly(e.target.checked)} className="self-center" />
        <span className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" aria-pressed={json} onClick={() => setJson(!json)}>
            {json ? t('customization.editor.formView') : t('customization.editor.jsonView')}
          </Button>
          {editable && Object.keys(stored).length > 0 && (
            <Button size="sm" onClick={() => void state.resetScope(scope, target)}>
              {t('customization.editor.resetAll')}
            </Button>
          )}
        </span>
      </div>
      <p className="m-0 text-sm text-dim">
        {scope === 'layout' ? t('customization.scopeHint.layout', { layout: layoutId ?? '' }) : t(`customization.scopeHint.${scope}`)}
      </p>

      {json ? (
        <JsonSettingsView
          key={`${scope}:${target ?? ''}`}
          scope={scope}
          scopeLabel={scopeLabel}
          values={stored}
          disabled={!editable}
          onApply={(values) => state.replaceScope(scope, values, target)}
        />
      ) : sections.length === 0 ? (
        <p className="m-0 text-muted">{t('customization.editor.noResults')}</p>
      ) : (
        sections.map(({ category, settings }) => {
          const name = t(`customization.categories.${category}`);
          const hasModified = settings.some((s) => s.id in stored);
          return (
            <Card
              key={category}
              title={name}
              actions={
                editable && hasModified ? (
                  <Button variant="ghost" size="sm" aria-label={t('customization.editor.resetCategory', { category: name })} onClick={() => void state.resetCategory(scope, category, target)}>
                    {t('customization.editor.reset')}
                  </Button>
                ) : undefined
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                {settings.map((def) => {
                  const resolved = state.resolve(def.id, { layoutId: target });
                  return (
                    <SettingField
                      key={def.id}
                      def={def}
                      value={def.id in stored ? stored[def.id]! : resolved.value}
                      source={resolved.source}
                      modified={def.id in stored}
                      disabled={!editable}
                      onChange={(value) => void state.setValue(scope, def.id, value, target)}
                      onReset={() => void state.resetValue(scope, def.id, target)}
                    />
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
