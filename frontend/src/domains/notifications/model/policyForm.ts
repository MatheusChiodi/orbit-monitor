import type { EscalationPolicy, PolicyRequest } from '../api/notificationsApi';

export interface StepDraft {
  /** Stable React key; never sent. */
  key: number;
  after: string;
  name: string;
  channelIds: string[];
  onCallScheduleId: string;
}

export interface PolicyDraft {
  name: string;
  allGroups: boolean;
  groupIds: string[];
  steps: StepDraft[];
}

/** Field → i18n key under `notificationSettings.escalation.errors`; step errors by index. */
export interface PolicyErrors {
  name?: string;
  groups?: string;
  steps?: string;
  step?: Record<number, { after?: string; target?: string }>;
}

let nextKey = 1;

export function newStep(after: number): StepDraft {
  return { key: nextKey++, after: String(after), name: '', channelIds: [], onCallScheduleId: '' };
}

export function draftFromPolicy(policy?: EscalationPolicy): PolicyDraft {
  return {
    name: policy?.name ?? '',
    allGroups: (policy?.groupIds.length ?? 0) === 0,
    groupIds: policy?.groupIds ?? [],
    steps: policy
      ? policy.steps.map((s) => ({ key: nextKey++, after: String(s.afterMinutes), name: s.name ?? '', channelIds: s.channelIds, onCallScheduleId: s.onCallScheduleId ?? '' }))
      : [newStep(0)],
  };
}

/** Suggested delay for an added step: 15 minutes after the last one. */
export function nextDelay(steps: readonly StepDraft[]): number {
  const last = Number(steps.at(-1)?.after);
  return Number.isFinite(last) && steps.length > 0 ? last + 15 : 0;
}

export function validatePolicy(draft: PolicyDraft): PolicyErrors {
  const errors: PolicyErrors = {};
  if (!draft.name.trim()) errors.name = 'name';
  if (!draft.allGroups && draft.groupIds.length === 0) errors.groups = 'groups';
  if (draft.steps.length === 0) errors.steps = 'steps';
  let previous = -1;
  const step: NonNullable<PolicyErrors['step']> = {};
  draft.steps.forEach((s, i) => {
    const after = Number(s.after);
    const e: { after?: string; target?: string } = {};
    if (s.after.trim() === '' || !Number.isInteger(after) || after < 0 || after < previous) e.after = 'after';
    else previous = after;
    if (s.channelIds.length === 0) e.target = 'target';
    if (e.after || e.target) step[i] = e;
  });
  if (Object.keys(step).length > 0) errors.step = step;
  return errors;
}

export function hasErrors(errors: PolicyErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toPolicyRequest(draft: PolicyDraft): PolicyRequest {
  return {
    name: draft.name.trim(),
    groupIds: draft.allGroups ? [] : draft.groupIds,
    steps: draft.steps.map((s) => ({
      afterMinutes: Number(s.after),
      channelIds: s.channelIds,
      name: s.name.trim() || null,
      onCallScheduleId: s.onCallScheduleId || null,
    })),
  };
}
