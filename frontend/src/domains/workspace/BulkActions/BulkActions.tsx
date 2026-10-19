import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { AccessMode, Group, MonitorView } from '@/shared/api/types';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';

export interface BulkActionsProps {
  selected: readonly MonitorView[];
  groups: readonly Group[];
  mode: AccessMode;
  onPause: (ids: string[]) => void;
  onTag: (ids: string[], tag: string) => void;
  onMove: (ids: string[], groupId: string) => void;
  onDelete: (ids: string[]) => void;
  onClear: () => void;
}

type Panel = 'none' | 'tag' | 'move' | 'delete';

/** FE-31: toolbar for the monitors selected in the list; delete asks for confirmation. Edit mode only. */
export function BulkActions({ selected, groups, mode, onPause, onTag, onMove, onDelete, onClear }: BulkActionsProps) {
  const { t } = useTranslation();
  const dialog = useMotionPreset('dialog');
  const ids = { tag: useId(), group: useId(), title: useId() };
  const [panel, setPanel] = useState<Panel>('none');
  const [tag, setTag] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const cancel = useRef<HTMLButtonElement>(null);
  const selectedIds = selected.map((m) => m.id);
  const count = selected.length;

  useEffect(() => {
    if (panel !== 'delete') return;
    cancel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel('none');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  if (mode !== 'edit' || count === 0) return null;

  return (
    <div role="toolbar" aria-label={t('bulk.toolbar')} className="flex flex-wrap items-center gap-[0.5rem] rounded-[0.6rem] border border-line-2 bg-s2 p-[0.5rem]">
      <span className="text-[0.85rem] font-semibold">{t('bulk.selected', { count })}</span>
      <Button onClick={() => onPause(selectedIds)}>{t('bulk.pause')}</Button>
      <Button onClick={() => setPanel(panel === 'tag' ? 'none' : 'tag')}>{t('bulk.tag')}</Button>
      <Button onClick={() => setPanel(panel === 'move' ? 'none' : 'move')}>{t('bulk.move')}</Button>
      <Button variant="danger" onClick={() => setPanel('delete')}>
        {t('bulk.delete')}
      </Button>
      <Button variant="ghost" onClick={onClear}>
        ✕
      </Button>

      {panel === 'tag' && (
        <span className="inline-flex items-center gap-[0.4rem]">
          <label htmlFor={ids.tag} className="sr-only">
            {t('bulk.tag')}
          </label>
          <input
            id={ids.tag}
            autoFocus
            className={`${INPUT_CLASS} w-auto`}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tag.trim()) {
                onTag(selectedIds, tag.trim());
                setTag('');
                setPanel('none');
              }
            }}
          />
        </span>
      )}

      {panel === 'move' && (
        <span className="inline-flex items-center gap-[0.4rem]">
          <label htmlFor={ids.group} className="sr-only">
            {t('bulk.targetGroup')}
          </label>
          <select id={ids.group} className={`${SELECT_CLASS} w-auto`} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            onClick={() => {
              if (!groupId) return;
              onMove(selectedIds, groupId);
              setPanel('none');
            }}
          >
            {t('bulk.moveConfirm')}
          </Button>
        </span>
      )}

      {/* Confirmation enters with the dialog preset; it closes at once so Escape/Cancel feel immediate. */}
      {panel === 'delete' && (
          <motion.div
            key="confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={ids.title}
            initial={dialog.initial}
            animate={dialog.animate}
            transition={dialog.transition}
            className="fixed inset-x-0 top-[20vh] z-50 mx-auto flex w-[min(26rem,92vw)] flex-col gap-[0.8rem] rounded-[0.9rem] border border-line-2 bg-s1 p-[1rem] shadow-2xl"
          >
            <h2 id={ids.title} className="m-0 text-[1rem] font-semibold">
              {t('bulk.confirmTitle', { count })}
            </h2>
            <ul className="m-0 list-disc pl-[1.2rem] text-[0.8rem] text-muted">
              {selected.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <SafeValue value={m.name} />
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-[0.5rem]">
              <Button ref={cancel} onClick={() => setPanel('none')}>
                {t('bulk.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDelete(selectedIds);
                  setPanel('none');
                }}
              >
                {t('bulk.confirmAction', { count })}
              </Button>
            </div>
          </motion.div>
      )}
    </div>
  );
}
