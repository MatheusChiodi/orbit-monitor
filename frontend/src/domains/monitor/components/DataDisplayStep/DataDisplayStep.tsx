import { useTranslation } from 'react-i18next';
import type { DisplayMode, FieldDisplay } from '@/shared/api/types';
import type { FieldFormat } from '@/shared/format';
import { INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';

export interface DataDisplayStepProps {
  fields: readonly FieldDisplay[];
  onChange: (fields: FieldDisplay[]) => void;
}

const FORMATS: FieldFormat[] = ['integer', 'decimal', 'currency', 'percent', 'duration', 'relative', 'text'];
const DISPLAYS: DisplayMode[] = ['number', 'gauge', 'indicators', 'line', 'bars', 'table', 'text', 'semaphore', 'hidden'];

/**
 * "Data & display" step: choose what to store and how each field appears.
 * Unchecked fields are not stored.
 */
export function DataDisplayStep({ fields, onChange }: DataDisplayStepProps) {
  const { t } = useTranslation();

  function update(index: number, patch: Partial<FieldDisplay>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  const selected = fields.filter((f) => f.selected).length;

  return (
    <div className="flex flex-col gap-[0.5rem]">
      <p className="m-0 text-[0.8rem] text-muted">{t('fields.count', { selected, total: fields.length })}</p>
      {fields.map((field, index) => {
        const off = !field.selected;
        return (
          <div
            key={field.field}
            role="group"
            aria-label={field.field}
            className={`grid grid-cols-1 items-center gap-[0.4rem] rounded-[0.45rem] border border-line p-[0.55rem] md:grid-cols-[minmax(9rem,1.2fr)_1.2fr_1fr_0.6fr_auto_1fr] ${off ? 'bg-transparent' : 'bg-s1'}`}
          >
            <label className="flex min-w-0 items-center gap-[0.45rem] font-mono text-[0.8rem]">
              <input
                type="checkbox"
                aria-label={t('fields.store', { field: field.field })}
                checked={field.selected}
                onChange={(e) => update(index, { selected: e.target.checked })}
              />
              <span className="truncate">{field.field}</span>
            </label>
            <input
              aria-label={t('fields.label')}
              className={INPUT_CLASS}
              value={field.label}
              disabled={off}
              onChange={(e) => update(index, { label: e.target.value })}
            />
            <select
              aria-label={t('fields.format')}
              className={SELECT_CLASS}
              value={field.format}
              disabled={off}
              onChange={(e) => update(index, { format: e.target.value as FieldFormat })}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`fields.formats.${f}`)}
                </option>
              ))}
            </select>
            <input
              aria-label={t('fields.unit')}
              className={INPUT_CLASS}
              value={field.unit ?? ''}
              placeholder={t('fields.unitPlaceholder')}
              disabled={off}
              onChange={(e) => update(index, { unit: e.target.value || undefined })}
            />
            <label className="flex items-center gap-[0.35rem] text-[0.78rem] whitespace-nowrap text-muted">
              <input
                type="checkbox"
                aria-label={t('fields.series')}
                checked={field.storeAsSeries}
                disabled={off}
                onChange={(e) => update(index, { storeAsSeries: e.target.checked })}
              />
              {t('fields.seriesShort')}
            </label>
            <select
              aria-label={t('fields.display')}
              className={SELECT_CLASS}
              value={field.display}
              disabled={off}
              onChange={(e) => update(index, { display: e.target.value as DisplayMode })}
            >
              {DISPLAYS.map((d) => (
                <option key={d} value={d}>
                  {t(`fields.displays.${d}`)}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
