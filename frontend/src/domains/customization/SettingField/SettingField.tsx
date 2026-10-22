import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { settingLabel, sourceLabel, valueLabel } from '@/shared/customization/labels';
import type { ListSetting, SettingDefinition, SettingValue, ValueSource } from '@/shared/customization/types';
import { COLOR_TOKENS } from '@/shared/customization/validate';
import { Button, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';

export interface SettingFieldProps {
  def: SettingDefinition;
  value: SettingValue;
  source: ValueSource;
  /** The value is stored at the scope being edited (shows the reset button). */
  modified: boolean;
  disabled?: boolean;
  onChange: (value: SettingValue) => void;
  onReset: () => void;
}

function ListField({ def, value, disabled, onChange }: { def: ListSetting; value: readonly string[]; disabled: boolean; onChange: (v: string[]) => void }) {
  const { t } = useTranslation();
  const required = def.required ?? [];
  const rows = [...value, ...def.values.filter((v) => !value.includes(v))];
  const move = (item: string, delta: number) => {
    const next = [...value];
    const from = next.indexOf(item);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to]!, next[from]!];
    onChange(next);
  };
  return (
    <fieldset aria-label={settingLabel(t, def)} className="m-0 flex flex-col gap-[0.25rem] border-0 p-0">
      {rows.map((item) => {
        const checked = value.includes(item);
        const index = value.indexOf(item);
        const name = valueLabel(t, item);
        return (
          <div key={item} className="flex items-center gap-[0.4rem] text-[0.85rem]">
            <label className="flex flex-1 items-center gap-[0.4rem]">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || required.includes(item)}
                onChange={() => onChange(checked ? value.filter((v) => v !== item) : [...value, item])}
              />
              {name}
            </label>
            {checked && (
              <>
                <Button variant="ghost" className="h-[1.6rem] px-[0.4rem]" aria-label={t('customization.editor.moveUp', { name })} disabled={disabled || index === 0} onClick={() => move(item, -1)}>
                  ↑
                </Button>
                <Button variant="ghost" className="h-[1.6rem] px-[0.4rem]" aria-label={t('customization.editor.moveDown', { name })} disabled={disabled || index === value.length - 1} onClick={() => move(item, 1)}>
                  ↓
                </Button>
              </>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

function TextField({ id, value, maxLength, disabled, onChange }: { id: string; value: string; maxLength: number; disabled: boolean; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(value);
  }
  return (
    <input
      id={id}
      className={INPUT_CLASS}
      value={draft}
      maxLength={maxLength}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onChange(draft)}
    />
  );
}

/** One control generated from a registry definition (CORE-21). */
export function SettingField({ def, value, source, modified, disabled = false, onChange, onReset }: SettingFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const label = settingLabel(t, def);
  const hintId = `${id}-hint`;
  const describedBy = def.description ? hintId : undefined;

  let control;
  switch (def.type) {
    case 'boolean':
      control = (
        <label className="flex items-center gap-[0.5rem] text-[0.88rem]">
          <input id={id} type="checkbox" checked={value === true} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(e.target.checked)} />
          {label}
        </label>
      );
      break;
    case 'enum':
    case 'action':
    case 'font':
      control = (
        <select id={id} className={SELECT_CLASS} value={String(value)} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)}>
          {def.values.map((v) => (
            <option key={v} value={v}>
              {valueLabel(t, v)}
            </option>
          ))}
        </select>
      );
      break;
    case 'number':
      control = (
        <span className="flex items-center gap-[0.4rem]">
          <input
            id={id}
            type="number"
            className={INPUT_CLASS}
            value={Number(value)}
            min={def.min}
            max={def.max}
            step={def.step}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
          />
          {def.unit && <span className="text-[0.8rem] text-muted">{def.unit}</span>}
        </span>
      );
      break;
    case 'color':
      control = (
        <select id={id} className={SELECT_CLASS} value={String(value)} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)}>
          {[...new Set([...COLOR_TOKENS, String(value)])].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
      break;
    case 'text':
      control = <TextField id={id} value={String(value)} maxLength={def.maxLength} disabled={disabled} onChange={onChange} />;
      break;
    case 'list':
      control = <ListField def={def} value={Array.isArray(value) ? value : []} disabled={disabled} onChange={onChange} />;
      break;
    case 'object':
      control = <code className="text-[0.8rem] text-muted">{JSON.stringify(value)}</code>;
      break;
  }

  return (
    <div className="flex flex-col gap-[0.3rem]" data-setting={def.id} data-modified={modified || undefined}>
      <div className="flex items-baseline justify-between gap-[0.5rem] text-[0.8rem]">
        {def.type !== 'boolean' && def.type !== 'list' ? (
          <label htmlFor={id} className="text-muted">
            {label}
          </label>
        ) : (
          <span aria-hidden className="text-muted">
            {def.type === 'list' ? label : ''}
          </span>
        )}
        <span className="flex items-center gap-[0.4rem] text-[0.72rem] text-dim">
          {modified ? <span className="text-info">{t('customization.editor.modified')}</span> : source !== 'default' && t('customization.editor.inherited', { source: sourceLabel(t, source) })}
          {modified && !disabled && (
            <Button variant="ghost" className="h-[1.5rem] px-[0.4rem] text-[0.72rem]" aria-label={t('customization.editor.resetItem', { name: label })} onClick={onReset}>
              {t('customization.editor.reset')}
            </Button>
          )}
        </span>
      </div>
      {control}
      {def.description && (
        <span id={hintId} className="text-[0.72rem] text-dim">
          {t(def.description)}
        </span>
      )}
    </div>
  );
}
