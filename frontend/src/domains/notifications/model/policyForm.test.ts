import { describe, expect, it } from 'vitest';
import { draftFromPolicy, newStep, nextDelay, toPolicyRequest, validatePolicy } from './policyForm';

describe('policyForm', () => {
  it('starts with one immediate step', () => {
    const draft = draftFromPolicy();
    expect(draft.steps).toHaveLength(1);
    expect(draft.steps[0]!.after).toBe('0');
    expect(nextDelay(draft.steps)).toBe(15);
  });

  it('needs a name, a channel per step and increasing delays', () => {
    const draft = draftFromPolicy();
    draft.steps = [{ ...newStep(10), channelIds: ['ops'] }, { ...newStep(5), channelIds: [] }];
    expect(validatePolicy(draft)).toEqual({ name: 'name', step: { 1: { after: 'after', target: 'target' } } });
  });

  it('builds the request (empty groups = all groups, blank label = default)', () => {
    const draft = { ...draftFromPolicy(), name: ' Payments ' };
    draft.steps = [{ ...newStep(0), channelIds: ['ops'], onCallScheduleId: 'platform' }];
    expect(toPolicyRequest(draft)).toEqual({
      name: 'Payments',
      groupIds: [],
      steps: [{ afterMinutes: 0, channelIds: ['ops'], name: null, onCallScheduleId: 'platform' }],
    });
  });
});
