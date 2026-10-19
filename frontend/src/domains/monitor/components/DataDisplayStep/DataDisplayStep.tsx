import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { DisplayMode, FieldDisplay } from '@/shared/api/types';
import type { FieldFormat } from '@/shared/format';
import { safeText, type DataClass } from '@/shared/privacy/redact';
import { AnimatedItem, Badge, FlashValue, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';

export interface DataDisplayStepProps {
  fields: readonly FieldDisplay[];
  onChange: (fields: FieldDisplay[]) => void;
}

const FORMATS: FieldFormat[] = ['integer', 'decimal', 'currency', 'percent', 'duration', 'relative', 'text'];
const DISPLAYS: DisplayMode[] = ['number', 'gauge', 'indicators', 'line', 'bars', 'table', 'text', 'semaphore', 'hidden'];

function isPci(dataClass: DataClass | null | undefined): boolean {
  return dataClass === 'PCI_PAN' || dataClass === 'PCI_SAD';
}

function isSensitive(dataClass: DataClass | null | undefined): boolean {
  return dataClass !== null && dataClass !== undefined;
}

function PrivacyBadge({ dataClass }: { dataClass: DataClass | null | undefined }) {
  const { t } = useTranslation();
  if (isPci(dataClass)) return <Badge tone="WARN">{t('privacy.pciBadge')}</Badge>;
  if (dataClass === 'PERSONAL') return <Badge tone="INFO">{t('privacy.personalBadge')}</Badge>;
  return null;
}

/**
 * "Data & display" step: choose what to store and how each field appears.
 * Unchecked fields are not stored. Card data is always masked and never stored as a series;
 * personal data is masked by default; neither can go to the wall.
 */
export function DataDisplayStep({ fields, onChange }: DataDisplayStepProps) {
  const { t } = useTranslation();

  function update(index: number, patch: Partial<FieldDisplay>) {
    const current = fields[index];
    if (!current) return;
    // Card data rules cannot be relaxed from the UI (the API rejects them too).
    if (isPci(current.dataClass) && (patch.storeAsSeries === true || patch.masked === false)) return;
    if (isSensitive(current.dataClass) && patch.showOnWall === true) return;
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  const selected = fields.filter((f) => f.selected).length;
  const hasCardData = fields.some((f) => isPci(f.dataClass));

  return (
    <div className="flex flex-col gap-[0.5rem]">
      <p className="m-0 text-[0.8rem] text-muted">
        <FlashValue value={selected}>{t('fields.count', { selected, total: fields.length })}</FlashValue>
      </p>
      {hasCardData && <p className="m-0 text-[0.8rem] text-warn-text">{t('privacy.pciNotice')}</p>}
      <AnimatePresence>
      {fields.map((field, index) => {
        const off = !field.selected;
        const pci = isPci(field.dataClass);
        const sensitive = isSensitive(field.dataClass);
        const masked = pci || Boolean(field.masked);
        return (
          <AnimatedItem
            as="div"
            key={field.field}
            index={index}
            count={fields.length}
            role="group"
            aria-label={field.field}
            className={`grid grid-cols-1 items-center gap-[0.4rem] rounded-[0.45rem] border border-line p-[0.55rem] md:grid-cols-[minmax(9rem,1.2fr)_1.2fr_1fr_0.6fr_auto_1fr_auto] ${off ? 'bg-transparent' : 'bg-s1'}`}
          >
            <label className="flex min-w-0 flex-wrap items-center gap-[0.45rem] font-mono text-[0.8rem]">
              <input
                type="checkbox"
                aria-label={t('fields.store', { field: field.field })}
                checked={field.selected}
                onChange={(e) => update(index, { selected: e.target.checked })}
              />
              <span className="truncate">{field.field}</span>
              <PrivacyBadge dataClass={field.dataClass} />
            </label>
            <input
              aria-label={t('fields.label')}
              className={INPUT_CLASS}
              value={safeText(field.label)}
              disabled={off}
              onChange={(e) => update(index, { label: e.target.value })}
            />
            <select
              aria-label={t('fields.format')}
              className={SELECT_CLASS}
              value={field.format}
              disabled={off || pci}
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
                checked={field.storeAsSeries && !pci}
                disabled={off || pci}
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
            <span className="flex flex-col gap-[0.2rem] text-[0.75rem] whitespace-nowrap text-muted">
              <label className="flex items-center gap-[0.35rem]">
                <input
                  type="checkbox"
                  aria-label={t('privacy.masked')}
                  checked={masked}
                  disabled={pci || !sensitive}
                  onChange={(e) => update(index, { masked: e.target.checked })}
                />
                {t('privacy.masked')}
              </label>
              <label className="flex items-center gap-[0.35rem]">
                <input
                  type="checkbox"
                  aria-label={t('privacy.showOnWall')}
                  checked={!sensitive && field.showOnWall !== false}
                  disabled={sensitive || off}
                  onChange={(e) => update(index, { showOnWall: e.target.checked })}
                />
                {t('privacy.showOnWall')}
              </label>
            </span>
          </AnimatedItem>
        );
      })}
      </AnimatePresence>
    </div>
  );
}
