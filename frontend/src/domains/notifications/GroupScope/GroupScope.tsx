import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/shared/ui';
import type { GroupRef } from '../api/notificationsApi';

export interface GroupScopeProps {
  legend: string;
  groups: readonly GroupRef[];
  all: boolean;
  selected: readonly string[];
  onChange: (next: { all: boolean; selected: string[] }) => void;
  error?: string;
}

/** "All groups" or a chosen subset; an empty list on the server means every group, new ones included. */
export function GroupScope({ legend, groups, all, selected, onChange, error }: GroupScopeProps) {
  const { t } = useTranslation();
  const toggle = (id: string, on: boolean) =>
    onChange({ all, selected: on ? [...selected, id] : selected.filter((g) => g !== id) });
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 p-0 text-sm font-medium text-text">{legend}</legend>
      {groups.length === 0 ? (
        <p className="m-0 text-sm text-muted">{t('notificationSettings.channels.form.noGroups')}</p>
      ) : (
        <>
          <Checkbox label={t('notificationSettings.channels.form.allGroups')} checked={all} onChange={(e) => onChange({ all: e.target.checked, selected: [...selected] })} />
          {!all && (
            <div className="grid gap-2 pl-6 sm:grid-cols-2">
              {groups.map((g) => (
                <Checkbox key={g.id} label={g.name} checked={selected.includes(g.id)} onChange={(e) => toggle(g.id, e.target.checked)} />
              ))}
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** "All groups" or the names of the chosen ones (ids of deleted groups are shown as they are). */
export function groupNames(ids: readonly string[] | null | undefined, groups: readonly GroupRef[], allLabel: string): string {
  if (!ids || ids.length === 0) return allLabel;
  return ids.map((id) => groups.find((g) => g.id === id)?.name ?? id).join(', ');
}
