import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccessMode, Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, Dialog, Field, IconButton, IconClose, IconPause, IconPlay, IconTrash, Select } from '@/shared/ui';

export interface BulkActionsProps {
  selected: readonly MonitorView[];
  groups: readonly Group[];
  mode: AccessMode;
  /** Pause (`true`) or resume (`false`); the buttons show only when the caller supports it. */
  onPause?: (ids: string[], paused: boolean) => void;
  onMove: (ids: string[], groupId: string) => void;
  onDelete: (ids: string[]) => void;
  onClear: () => void;
}

type Open = 'none' | 'move' | 'delete';

/** FE-31: toolbar for the monitors selected in the list; moving and deleting go through a dialog. Edit mode only. */
export function BulkActions({ selected, groups, mode, onPause, onMove, onDelete, onClear }: BulkActionsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Open>('none');
  const [groupId, setGroupId] = useState('');
  const cancel = useRef<HTMLButtonElement>(null);
  const ids = selected.map((m) => m.id);
  const count = selected.length;
  const close = () => setOpen('none');

  if (mode !== 'edit' || count === 0) return null;

  return (
    <div role="toolbar" aria-label={t('ops.monitors.bulk.toolbar')} className="flex flex-wrap items-center gap-2 rounded-md border border-line-2 bg-s2 px-3 py-2">
      <span className="mr-auto text-base font-semibold">{t('ops.monitors.bulk.selected', { count })}</span>
      {onPause && (
        <>
          <Button size="sm" variant="secondary" onClick={() => onPause(ids, true)}>
            <IconPause />
            {t('ops.monitors.bulk.pause')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onPause(ids, false)}>
            <IconPlay />
            {t('ops.monitors.bulk.resume')}
          </Button>
        </>
      )}
      <Button size="sm" variant="secondary" onClick={() => setOpen('move')} disabled={groups.length === 0}>
        {t('ops.monitors.bulk.move')}
      </Button>
      <Button size="sm" variant="danger" onClick={() => setOpen('delete')}>
        <IconTrash />
        {t('ops.monitors.bulk.delete')}
      </Button>
      <IconButton label={t('ops.monitors.bulk.clear')} icon={IconClose} size="sm" onClick={onClear} />

      <Dialog
        open={open === 'move'}
        onClose={close}
        size="sm"
        title={t('ops.monitors.bulk.move')}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('ops.monitors.bulk.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={!groupId}
              onClick={() => {
                onMove(ids, groupId);
                close();
              }}
            >
              {t('ops.monitors.bulk.moveConfirm')}
            </Button>
          </>
        }
      >
        <Field label={t('ops.monitors.bulk.moveTo')}>
          <Select value={groupId} placeholder={t('ops.monitors.bulk.moveTo')} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {safeText(g.name)}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>

      <Dialog
        open={open === 'delete'}
        onClose={close}
        size="sm"
        initialFocus={cancel}
        title={t('ops.monitors.bulk.confirmTitle', { count })}
        description={t('ops.monitors.bulk.confirmBody')}
        footer={
          <>
            <Button ref={cancel} variant="secondary" onClick={close}>
              {t('ops.monitors.bulk.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onDelete(ids);
                close();
              }}
            >
              {t('ops.monitors.bulk.confirmAction', { count })}
            </Button>
          </>
        }
      >
        <ul className="m-0 list-disc pl-5 text-sm text-muted">
          {selected.slice(0, 5).map((m) => (
            <li key={m.id}>
              <SafeValue value={m.name} />
            </li>
          ))}
          {count > 5 && <li>…</li>}
        </ul>
      </Dialog>
    </div>
  );
}
