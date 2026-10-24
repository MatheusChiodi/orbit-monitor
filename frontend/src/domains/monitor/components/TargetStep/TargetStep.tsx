import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupInput } from '@/shared/api/consoleTypes';
import type { Group } from '@/shared/api/types';
import { Button, Card, Field, TextInput } from '@/shared/ui';
import type { MonitorFormState } from '../../form';
import { GroupSelect } from '../GroupSelect';

export interface TargetStepProps {
  state: MonitorFormState;
  onChange: (patch: Partial<MonitorFormState>) => void;
  groups: readonly Group[];
  /** Group shown in the select (the only group is preselected). */
  groupId: string;
  onCreateGroup?: (group: GroupInput) => Promise<Group>;
  nameError?: string;
  groupError?: string;
  /** "Change type", only while creating. */
  onChangeKind?: () => void;
  /** Kind-specific fields (TargetFields). */
  target: ReactNode;
  /** Run preview button and why it is unavailable. */
  previewAction?: ReactNode;
  /** The live preview, beside the form on wide screens. */
  preview: ReactNode;
}

/** Step 1: what to watch (name, group, target, schedule) with the live preview beside it. */
export function TargetStep({ state, onChange, groups, groupId, onCreateGroup, nameError, groupError, onChangeKind, target, previewAction, preview }: TargetStepProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-sm text-muted">{t('monitorForm.flow.kind', { kind: t(`monitorForm.types.${state.type}`) })}</p>
            {onChangeKind && (
              <Button variant="ghost" size="sm" onClick={onChangeKind}>
                {t('monitorForm.flow.changeKind')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('form.name')} error={nameError}>
              <TextInput value={state.name} autoComplete="off" onChange={(e) => onChange({ name: e.target.value })} />
            </Field>
            <GroupSelect groups={groups} value={groupId} onChange={(id) => onChange({ groupId: id })} onCreate={onCreateGroup} error={groupError} />
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-4">{target}</div>
          {previewAction}
        </Card>
        <Card title={t('monitorForm.flow.schedule')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('form.interval')} hint={t('monitorForm.flow.intervalHint')}>
              <TextInput
                type="number"
                min={15}
                max={86400}
                className="font-mono"
                value={state.intervalSeconds}
                onChange={(e) => onChange({ intervalSeconds: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('form.retries')} hint={t('monitorForm.flow.retriesHint')}>
              <TextInput type="number" min={0} max={10} className="font-mono" value={state.retries} onChange={(e) => onChange({ retries: Number(e.target.value) })} />
            </Field>
          </div>
        </Card>
      </div>
      <div className="min-w-0 lg:col-span-2 lg:self-stretch">{preview}</div>
    </div>
  );
}
