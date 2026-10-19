/** Items of the per-feature config files; a file that does not exist yet is an empty list. */
export interface OnboardingResources {
  connections: readonly { id: string }[];
  selects: readonly { id: string }[];
  requests: readonly { id: string }[];
  layouts: readonly { id: string }[];
}

export type OnboardingStepId = 'connection' | 'monitor' | 'layout';

export interface OnboardingStep {
  id: OnboardingStepId;
  done: boolean;
}

/** FE-37: getting-started progress derived from what is already configured. */
export function onboardingSteps(resources: OnboardingResources): OnboardingStep[] {
  return [
    { id: 'connection', done: resources.connections.length > 0 },
    { id: 'monitor', done: resources.selects.length + resources.requests.length > 0 },
    { id: 'layout', done: resources.layouts.length > 0 },
  ];
}
