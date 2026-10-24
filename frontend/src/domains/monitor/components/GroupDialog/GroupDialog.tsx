import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { newId } from '@/domains/connections/model';
import type { GroupInput } from '@/shared/api/consoleTypes';
import type { Group } from '@/shared/api/types';
import { Button, Dialog, Field, TextInput, useToast } from '@/shared/ui';

export interface GroupDialogProps {
  open: boolean;
  /** Group being renamed; absent to create a new one. */
  group?: Group;
  /** Existing groups: a new id avoids theirs and a name cannot repeat. */
  groups: readonly Group[];
  onClose: () => void;
  /** `PUT /api/groups/{id}` (the console source's `saveGroup`). */
  onSave: (group: GroupInput) => Promise<Group>;
  onSaved: (group: Group) => void;
}

/** Create or rename a group (one name field). Used by the group select and the Monitors screen. */
export function GroupDialog(props: GroupDialogProps) {
  // A fresh form every time it opens.
  return props.open ? <GroupForm {...props} /> : null;
}

function GroupForm({ group, groups, onClose, onSave, onSaved }: GroupDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formId = 'group-dialog-form';

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError(t('monitorForm.group.nameRequired'));
    const clash = groups.some((g) => g.id !== group?.id && g.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (clash) return setError(t('monitorForm.group.exists'));
    setSaving(true);
    try {
      const input: GroupInput = group
        ? { id: group.id, name: trimmed, color: group.color ?? null, description: group.description ?? null, order: group.order ?? 0 }
        : { id: newId(trimmed, groups.map((g) => g.id)), name: trimmed, order: groups.length };
      const saved = await onSave(input);
      toast({ title: t(group ? 'monitorForm.group.renamed' : 'monitorForm.group.created'), tone: 'OK' });
      onSaved(saved);
    } catch (e) {
      setError(t('monitorForm.group.failed', { error: e instanceof Error ? e.message : '' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      size="sm"
      onClose={onClose}
      title={t(group ? 'monitorForm.group.renameTitle' : 'monitorForm.group.newTitle')}
      description={group ? group.name : t('monitorForm.group.newDescription')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={saving}>
            {t(group ? 'monitorForm.group.rename' : 'monitorForm.group.create')}
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
