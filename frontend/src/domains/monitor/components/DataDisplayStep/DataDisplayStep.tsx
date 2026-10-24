import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { moveItem } from '@/domains/workspace/reorder/reorder';
import type { DisplayMode, FieldDisplay, PreviewRow } from '@/shared/api/types';
import type { FieldFormat } from '@/shared/format';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { safeText, type DataClass } from '@/shared/privacy/redact';
import { AnimatedItem, Badge, Checkbox, Field, FlashValue, IconChevronDown, Select, TextInput } from '@/shared/ui';
import { systemFieldKey } from '../../display';

export interface DataDisplayStepProps {
  fields: readonly FieldDisplay[];
  onChange: (fields: FieldDisplay[]) => void;
  /** First row of the preview, for the live value of each field. */
  values?: PreviewRow;
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
 * "Data & display" step: one simple row per value (keep it, its name, the value now, how it shows) and the
 * rest behind "Formatting". Unchecked values are not stored. Card data is always masked and never kept as
 * a history chart; personal data is masked by default; neither can go to the wall.
 */
export function DataDisplayStep({ fields, onChange, values = {} }: DataDisplayStepProps) {
  const { t } = useTranslation();
  const baseId = useId();
  // FE-14: keyboard reorder (Space grabs/drops, arrows move, Escape cancels) on a local draft.
  const [draft, setDraft] = useState<FieldDisplay[] | null>(null);
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const shown = draft ?? fields;

  useEffect(() => {
    if (!grabbed) return;
    root.current?.querySelector<HTMLElement>(`[data-reorder-handle="${CSS.escape(grabbed)}"]`)?.focus();
  });

  const nameOf = (field: FieldDisplay) => safeText(field.label) || field.field;

  function onHandleKey(event: KeyboardEvent<HTMLButtonElement>, field: FieldDisplay) {
    const key = field.field;
    const index = shown.findIndex((f) => f.field === key);
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!grabbed) {
        setGrabbed(key);
        setDraft([...fields]);
      } else {
        setGrabbed(null);
        if (draft) onChange(draft);
        setDraft(null);
      }
    } else if (event.key === 'Escape' && grabbed) {
      event.preventDefault();
      setGrabbed(null);
      setDraft(null);
      setAnnouncement(t('layout.dnd.cancelled'));
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && grabbed === key) {
      event.preventDefault();
      const next = moveItem(shown, index, index + (event.key === 'ArrowDown' ? 1 : -1));
      setDraft(next);
      setAnnouncement(t('layout.dnd.position', { name: nameOf(field), position: next.findIndex((f) => f.field === key) + 1, total: next.length }));
    }
  }

  function update(key: string, patch: Partial<FieldDisplay>) {
    const current = fields.find((f) => f.field === key);
    if (!current) return;
    // Card data rules cannot be relaxed from the UI (the API rejects them too).
    if (isPci(current.dataClass) && (patch.storeAsSeries === true || patch.masked === false)) return;
    if (isSensitive(current.dataClass) && patch.showOnWall === true) return;
    onChange(fields.map((f) => (f.field === key ? { ...f, ...patch } : f)));
  }

  const selected = fields.filter((f) => f.selected).length;
  const hasCardData = fields.some((f) => isPci(f.dataClass));

  return (
    <div ref={root} className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <p className="m-0 flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted">
        <span>{t('monitorForm.data.intro')}</span>
        <FlashValue value={selected}>{t('monitorForm.data.count', { selected, total: fields.length })}</FlashValue>
      </p>
      {hasCardData && <p className="m-0 text-sm text-warn-text">{t('privacy.pciNotice')}</p>}
      <AnimatePresence>
        {shown.map((field, index) => {
          const off = !field.selected;
          const pci = isPci(field.dataClass);
          const sensitive = isSensitive(field.dataClass);
          const name = nameOf(field);
          const expanded = open === field.field;
          const panelId = `${baseId}-format-${index}`;
          const system = systemFieldKey(field.field);
          const source = system ? t('monitorForm.data.builtIn') : field.field;
          return (
            <AnimatedItem
              as="div"
              key={field.field}
              index={index}
              count={fields.length}
              role="group"
              aria-label={name}
              className={`flex flex-col gap-3 rounded-md border border-line p-3 ${off ? 'bg-transparent' : 'bg-s2'}`}
            >
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12">
                <span className="flex min-w-0 items-start gap-2 md:col-span-5">
                  <button
                    type="button"
                    data-reorder-handle={field.field}
                    aria-label={t('layout.dnd.reorder', { name })}
                    aria-pressed={grabbed === field.field}
                    onKeyDown={(e) => onHandleKey(e, field)}
                    className="mt-0.5 cursor-grab rounded-sm px-1 text-muted hover:text-text"
                  >
                    ⋮⋮
                  </button>
                  <Checkbox
                    className="min-w-0"
                    label={
                      <span className="flex flex-wrap items-center gap-2">
                        {name}
                        <PrivacyBadge dataClass={field.dataClass} />
                      </span>
                    }
                    description={<span className="break-all font-mono text-xs">{t('monitorForm.data.source', { source })}</span>}
                    aria-label={t('monitorForm.data.keep', { name })}
                    checked={field.selected}
                    onChange={(e) => update(field.field, { selected: e.target.checked })}
                  />
                </span>
                <span className="flex min-w-0 items-baseline gap-2 md:col-span-2">
                  <span className="text-xs text-dim md:sr-only">{t('monitorForm.data.value')}</span>
                  <SafeValue value={values[field.field] ?? null} field={field.field} className="truncate font-mono text-sm text-text" />
                </span>
                <span className="md:col-span-3">
                  <Select aria-label={t('monitorForm.data.display')} value={field.display} disabled={off} onChange={(e) => update(field.field, { display: e.target.value as DisplayMode })}>
                    {DISPLAYS.map((d) => (
                      <option key={d} value={d}>
                        {t(`fields.displays.${d}`)}
                      </option>
                    ))}
                  </Select>
                </span>
                <span className="md:col-span-2 md:justify-self-end">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={t('monitorForm.data.formattingFor', { name })}
                    onClick={() => setOpen(expanded ? null : field.field)}
                    className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-sm text-muted hover:bg-s3 hover:text-text"
                  >
                    {t('monitorForm.data.formatting')}
                    <IconChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
                  </button>
                </span>
              </div>
              {expanded && (
                <div id={panelId} className="grid grid-cols-1 gap-3 border-t border-line pt-3 sm:grid-cols-3">
                  <Field label={t('monitorForm.data.name')}>
                    <TextInput value={safeText(field.label)} disabled={off} onChange={(e) => update(field.field, { label: e.target.value })} />
                  </Field>
                  <Field label={t('fields.format')}>
                    <Select value={field.format} disabled={off || pci} onChange={(e) => update(field.field, { format: e.target.value as FieldFormat })}>
                      {FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {t(`fields.formats.${f}`)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('fields.unit')}>
                    <TextInput value={field.unit ?? ''} placeholder={t('fields.unitPlaceholder')} disabled={off} onChange={(e) => update(field.field, { unit: e.target.value || undefined })} />
                  </Field>
                  <div className="flex flex-col gap-2 sm:col-span-3 sm:flex-row sm:gap-6">
                    <Checkbox
                      label={t('monitorForm.data.history')}
                      checked={field.storeAsSeries && !pci}
                      disabled={off || pci}
                      onChange={(e) => update(field.field, { storeAsSeries: e.target.checked })}
                    />
                    <Checkbox label={t('privacy.masked')} checked={pci || Boolean(field.masked)} disabled={pci || !sensitive} onChange={(e) => update(field.field, { masked: e.target.checked })} />
                    <Checkbox
                      label={t('privacy.showOnWall')}
                      checked={!sensitive && field.showOnWall !== false}
                      disabled={sensitive || off}
                      onChange={(e) => update(field.field, { showOnWall: e.target.checked })}
                    />
                  </div>
                </div>
              )}
            </AnimatedItem>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
