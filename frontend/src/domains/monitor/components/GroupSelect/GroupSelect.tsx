import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupInput } from '@/shared/api/consoleTypes';
import type { Group } from '@/shared/api/types';
import { newId } from '@/domains/connections/model';
import { Button, Dialog, Field, IconPlus, Select, TextInput, useToast } from '@/shared/ui';

/** Value of the group select on a fresh install: a "Default" group is created when the monitor is saved. */
export const AUTO_GROUP = '__default__';

export interface GroupSelectProps {
  groups: readonly Group[];
  value: string;
  onChange: (groupId: string) => void;
  /** Creates a group (`PUT /api/groups/{id}`); without it there is no "New group" button. */
  onCreate?: (group: GroupInput) => Promise<Group>;
  error?: string;
}

/** The group a monitor belongs to, with an inline "New group" so a first monitor never gets stuck. */
export function GroupSelect({ groups, value, onChange, onCreate, error }: GroupSelectProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const empty = groups.length === 0;
  return (
    <Field label={t('form.group')} error={error} hint={empty ? t('monitorForm.group.autoHint') : undefined}>
      <div className="flex min-w-0 gap-2">
        <Select className="min-w-0 flex-1" value={empty ? AUTO_GROUP : value} placeholder={empty ? undefined : t('form.choose')} onChange={(e) => onChange(e.target.value)}>
          {empty && <option value={AUTO_GROUP}>{t('monitorForm.group.auto')}</option>}
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        {onCreate && (
          <Button variant="secondary" onClick={() => setCreating(true)} className="shrink-0">
            <IconPlus />
            {t('monitorForm.group.new')}
          </Button>
        )}
      </div>
      {onCreate && (
        <NewGroupDialog
          open={creating}
          groups={groups}
          onClose={() => setCreating(false)}
          onCreate={onCreate}
          onCreated={(group) => {
            setCreating(false);
            onChange(group.id);
          }}
        />
      )}
    </Field>
  );
}

interface NewGroupDialogProps {
  open: boolean;
  groups: readonly Group[];
  onClose: () => void;
  onCreate: (group: GroupInput) => Promise<Group>;
  onCreated: (group: Group) => void;
}

function NewGroupDialog({ open, groups, onClose, onCreate, onCreated }: NewGroupDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formId = 'new-group-form';

  function close() {
    setName('');
    setError(null);
    onClose();
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError(t('monitorForm.group.nameRequired'));
    if (groups.some((g) => g.name.trim().toLowerCase() === trimmed.toLowerCase())) return setError(t('monitorForm.group.exists'));
    setSaving(true);
    try {
      const group = await onCreate({ id: newId(trimmed, groups.map((g) => g.id)), name: trimmed, order: groups.length });
      toast({ title: t('monitorForm.group.created'), tone: 'OK' });
      setName('');
      setError(null);
      onCreated(group);
    } catch (e) {
      setError(t('monitorForm.group.failed', { error: e instanceof Error ? e.message : '' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      size="sm"
      onClose={close}
      title={t('monitorForm.group.newTitle')}
      description={t('monitorForm.group.newDescription')}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={saving}>
            {t('monitorForm.group.create')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label={t('monitorForm.group.name')} error={error ?? undefined}>
          <TextInput value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
