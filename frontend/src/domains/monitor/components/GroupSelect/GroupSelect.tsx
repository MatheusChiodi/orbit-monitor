import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupInput } from '@/shared/api/consoleTypes';
import type { Group } from '@/shared/api/types';
import { Button, Field, IconPlus, Select } from '@/shared/ui';
import { GroupDialog } from '../GroupDialog';

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
        <GroupDialog
          open={creating}
          groups={groups}
          onClose={() => setCreating(false)}
          onSave={onCreate}
          onSaved={(group) => {
            setCreating(false);
            onChange(group.id);
          }}
        />
      )}
    </Field>
  );
}
