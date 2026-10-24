import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupInput } from '@/shared/api/consoleTypes';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { Button, Dialog, Field, Select, TextInput } from '@/shared/ui';
import { groupIdFor } from './GroupManager';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

export interface GroupNameDialogProps {
  open: boolean;
  /** Rename this group; without it the dialog creates one. */
  group?: Group | null;
  groups: readonly Group[];
  onSave: (group: GroupInput) => Promise<unknown>;
  onClose: () => void;
}

/** "New group" and "Rename group": one name field; a rename keeps the group's id and position. */
export function GroupNameDialog({ open, group, groups, onSave, onClose }: GroupNameDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setError(null);
  }, [open, group]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(t('ops.monitors.groups.nameRequired'));
    setBusy(true);
    try {
      const index = group ? groups.findIndex((g) => g.id === group.id) : groups.length;
      await onSave({ id: group?.id ?? groupIdFor(trimmed, groups), name: trimmed, order: Math.max(index, 0) });
      onClose();
    } catch (e) {
      setError(reason(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={group ? t('ops.monitors.groups.renameTitle', { name: safeText(group.name) }) : t('ops.monitors.groups.new')}
      description={group ? undefined : t('ops.monitors.groups.newHint')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('ops.monitors.groups.cancel')}
          </Button>
          <Button type="submit" form="group-name-form" variant="primary" loading={busy}>
            {group ? t('ops.monitors.groups.save') : t('ops.monitors.groups.create')}
          </Button>
        </>
      }
    >
      <form id="group-name-form" onSubmit={(e) => void submit(e)} noValidate>
        <Field label={t('ops.monitors.groups.name')} error={error ?? undefined}>
          <TextInput value={name} placeholder={t('ops.monitors.groups.newPlaceholder')} onChange={(e) => setName(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}

export interface DeleteGroupDialogProps {
  group: Group | null;
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  /** `moveTo` is set when the group still has monitors (`DELETE /api/groups/{id}?moveTo=`). */
  onDelete: (id: string, moveTo?: string) => Promise<unknown>;
  onClose: () => void;
}

/** Deleting a group says what happens to its monitors: they move to the chosen group first. */
export function DeleteGroupDialog({ group, groups, monitors, onDelete, onClose }: DeleteGroupDialogProps) {
  const { t } = useTranslation();
  const cancel = useRef<HTMLButtonElement>(null);
  const [moveTo, setMoveTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const members = group ? monitors.filter((m) => m.groupId === group.id) : [];
  const others = groups.filter((g) => g.id !== group?.id);
  const count = members.length;

  useEffect(() => {
    setMoveTo('');
    setError(null);
  }, [group]);

  async function confirm() {
    if (!group) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(group.id, count > 0 ? moveTo : undefined);
      onClose();
    } catch (e) {
      setError(reason(e));
    } finally {
      setBusy(false);
    }
  }

  const name = group ? safeText(group.name) : '';
  return (
    <Dialog
      open={group !== null}
      onClose={onClose}
      size="sm"
      initialFocus={cancel}
      title={t('ops.monitors.groups.deleteTitle', { name })}
      description={count === 0 ? t('ops.monitors.groups.deleteEmpty') : t('ops.monitors.groups.deleteMove', { count })}
      footer={
        <>
          <Button ref={cancel} variant="secondary" onClick={onClose}>
            {t('ops.monitors.groups.cancel')}
          </Button>
          <Button variant="danger" loading={busy} disabled={count > 0 && !moveTo} onClick={() => void confirm()}>
            {t('ops.monitors.groups.deleteConfirm')}
          </Button>
        </>
      }
    >
      {count > 0 &&
        (others.length === 0 ? (
          <p className="m-0 text-base text-muted">{t('ops.monitors.groups.needAnother')}</p>
        ) : (
          <Field label={t('ops.monitors.groups.moveTo', { count })}>
            <Select value={moveTo} placeholder={t('ops.monitors.groups.chooseGroup')} onChange={(e) => setMoveTo(e.target.value)}>
              {others.map((g) => (
                <option key={g.id} value={g.id}>
                  {safeText(g.name)}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      {error && (
        <p role="alert" className="m-0 mt-3 text-sm text-down-text">
          {error}
        </p>
      )}
    </Dialog>
  );
}

export interface MoveMonitorDialogProps {
  monitor: MonitorView | null;
  groups: readonly Group[];
  onMove: (id: string, groupId: string) => Promise<unknown>;
  onClose: () => void;
}

/** "Move to group…" from a monitor row. */
export function MoveMonitorDialog({ monitor, groups, onMove, onClose }: MoveMonitorDialogProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setTarget(''), [monitor]);
  return (
    <Dialog
      open={monitor !== null}
      onClose={onClose}
      size="sm"
      title={t('ops.monitors.moveTitle', { name: monitor ? safeText(monitor.name) : '' })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('ops.monitors.groups.cancel')}
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!target}
            onClick={async () => {
              if (!monitor) return;
              setBusy(true);
              try {
                await onMove(monitor.id, target);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('ops.monitors.bulk.moveConfirm')}
          </Button>
        </>
      }
    >
      <Field label={t('ops.monitors.bulk.moveTo')}>
        <Select value={target} placeholder={t('ops.monitors.groups.chooseGroup')} onChange={(e) => setTarget(e.target.value)}>
          {groups
            .filter((g) => g.id !== monitor?.groupId)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {safeText(g.name)}
              </option>
            ))}
        </Select>
      </Field>
    </Dialog>
  );
}
