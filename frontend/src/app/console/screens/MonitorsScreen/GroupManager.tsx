import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupInput } from '@/shared/api/consoleTypes';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, Dialog, Field, IconButton, IconEdit, IconTrash, TextInput } from '@/shared/ui';

export interface GroupManagerProps {
  open: boolean;
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  /** Creates or renames (`PUT /api/groups/{id}`); `order` keeps the group where it is. */
  onSave: (group: GroupInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onClose: () => void;
}

/** A readable, unique group id from its name ("Data Warehouse" → `data-warehouse`). */
export function groupIdFor(name: string, groups: readonly { id: string }[]): string {
  const base =
    name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'group';
  const taken = new Set(groups.map((g) => g.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Rename, delete (empty groups only) and add groups, from the Monitors screen. */
export function GroupManager({ open, groups, monitors, onSave, onDelete, onClose }: GroupManagerProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [fresh, setFresh] = useState('');
  const [freshError, setFreshError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const count = (id: string) => monitors.filter((m) => m.groupId === id).length;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function rename(event: FormEvent, group: Group, order: number) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (await run(() => onSave({ id: group.id, name, order }))) setEditing(null);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const name = fresh.trim();
    if (!name) {
      setFreshError(t('ops.monitors.groups.nameRequired'));
      return;
    }
    setFreshError(null);
    if (await run(() => onSave({ id: groupIdFor(name, groups), name, order: groups.length }))) setFresh('');
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('ops.monitors.groups.title')}
      description={t('ops.monitors.groups.description')}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('ops.monitors.groups.done')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {groups.length === 0 ? (
          <p className="m-0 text-base text-muted">{t('ops.monitors.groups.none')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-md border border-line p-0">
            {groups.map((group, index) => {
              const n = count(group.id);
              const label = safeText(group.name);
              return (
                <li key={group.id} aria-label={label} className="flex min-h-12 items-center gap-2 px-3 py-1.5">
                  {editing === group.id ? (
                    <form className="flex flex-1 items-center gap-2" onSubmit={(e) => void rename(e, group, index)}>
                      <TextInput
                        aria-label={t('ops.monitors.groups.name')}
                        value={draft}
                        autoFocus
                        onChange={(e) => setDraft(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" size="sm" variant="primary" loading={busy} disabled={!draft.trim()}>
                        {t('ops.monitors.groups.save')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        {t('ops.monitors.groups.cancel')}
                      </Button>
                    </form>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        <SafeValue value={group.name} />
                      </span>
                      <span className="shrink-0 text-sm text-muted">{t('ops.monitors.groups.count', { count: n })}</span>
                      <IconButton
                        label={t('ops.monitors.groups.rename', { name: label })}
                        icon={IconEdit}
                        size="sm"
                        onClick={() => {
                          setEditing(group.id);
                          setDraft(group.name);
                        }}
                      />
                      <IconButton
                        label={t('ops.monitors.groups.delete', { name: label })}
                        icon={IconTrash}
                        size="sm"
                        disabled={n > 0 || busy}
                        title={n > 0 ? t('ops.monitors.groups.notEmpty') : undefined}
                        onClick={() => void run(() => onDelete(group.id))}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => void create(e)} noValidate>
          <Field label={t('ops.monitors.groups.new')} error={freshError ?? undefined} className="flex-1">
            <TextInput value={fresh} placeholder={t('ops.monitors.groups.newPlaceholder')} onChange={(e) => setFresh(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" loading={busy}>
            {t('ops.monitors.groups.create')}
          </Button>
        </form>
        {error && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
