import type { TFunction } from 'i18next';
import type { Connection, Group } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { isPreviewable, type KeptCondition, type MonitorFormState } from '../../form';
import { AUTO_GROUP } from '../GroupSelect';
import type { ReviewItem } from '../ReviewStep';

interface ReviewInput {
  state: MonitorFormState;
  groups: readonly Group[];
  groupId: string;
  connections: readonly Connection[];
  keptConditions: readonly KeptCondition[];
  sentences: readonly string[];
  t: TFunction;
}

function target(state: MonitorFormState, connections: readonly Connection[]): string {
  switch (state.type) {
    case 'HTTP':
      return `${state.method} ${state.url}`;
    case 'HTTP_STEPS':
      return state.steps.map((s) => `${s.method} ${s.url}`).join(' → ');
    case 'SQL': {
      const connection = connections.find((c) => c.id === state.connectionId);
      return `${connection?.name ?? state.connectionId} · ${state.sql.trim().split('\n')[0] ?? ''}`;
    }
    case 'PUSH':
      return `${state.maxSilenceSeconds} s`;
    case 'KAFKA':
      return `${state.bootstrapServers} · ${state.consumerGroup}`;
    default:
      return state.port ? `${state.host}:${state.port}` : state.host;
  }
}

/** Everything the monitor will do, in plain words, for the Review step. */
export function reviewItems({ state, groups, groupId, connections, keptConditions, sentences, t }: ReviewInput): ReviewItem[] {
  const none = <span className="text-muted">{t('monitorForm.review.none')}</span>;
  const group = groupId === AUTO_GROUP ? t('monitorForm.group.auto') : (groups.find((g) => g.id === groupId)?.name ?? '');
  const kept = state.fields.filter((f) => f.selected).map((f) => safeText(f.label) || f.field);
  const rules = [...sentences, ...keptConditions.map((k) => k.expression)];
  const items: ReviewItem[] = [
    { step: 'target', label: t('monitorForm.review.name'), value: state.name.trim() || none },
    { step: 'target', label: t('monitorForm.review.group'), value: group || none },
    {
      step: 'target',
      label: t('monitorForm.review.target'),
      value: <span className="block truncate font-mono text-sm">{`${t(`monitorForm.types.${state.type}`)} · ${target(state, connections)}`}</span>,
    },
    { step: 'target', label: t('monitorForm.review.schedule'), value: t('monitorForm.review.every', { seconds: state.intervalSeconds, retries: state.retries }) },
  ];
  if (isPreviewable(state.type)) items.push({ step: 'data', label: t('monitorForm.review.kept'), value: kept.length ? kept.join(', ') : none });
  items.push({
    step: 'conditions',
    label: t('monitorForm.review.rules'),
    value: rules.length ? (
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    ) : (
      none
    ),
  });
  return items;
}
