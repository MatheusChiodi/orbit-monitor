import type { ComponentType } from 'react';
import { CHECK_FLOW_DEFAULTS, CheckFlow, type CheckFlowProps } from './CheckFlow';
import { FIRST_MONITOR_DEFAULTS, FirstMonitor, type FirstMonitorProps } from './FirstMonitor';
import { ORBIT_BOOT_DEFAULTS, OrbitBoot, type OrbitBootProps } from './OrbitBoot';

export const FPS = 30;
export const WIDTH = 1280;
export const HEIGHT = 720;

export type IntroPropsMap = {
  'orbit-boot': OrbitBootProps;
  'check-flow': CheckFlowProps;
  'first-monitor': FirstMonitorProps;
};

export type IntroId = keyof IntroPropsMap;

export type IntroDefinition<K extends IntroId> = {
  id: K;
  component: ComponentType<IntroPropsMap[K]>;
  durationInFrames: number;
  defaultProps: IntroPropsMap[K];
};

export const INTROS: { [K in IntroId]: IntroDefinition<K> } = {
  'orbit-boot': { id: 'orbit-boot', component: OrbitBoot, durationInFrames: 4 * FPS, defaultProps: ORBIT_BOOT_DEFAULTS },
  'check-flow': { id: 'check-flow', component: CheckFlow, durationInFrames: 6 * FPS, defaultProps: CHECK_FLOW_DEFAULTS },
  'first-monitor': {
    id: 'first-monitor',
    component: FirstMonitor,
    durationInFrames: 7 * FPS,
    defaultProps: FIRST_MONITOR_DEFAULTS,
  },
};

export const INTRO_IDS = Object.keys(INTROS) as IntroId[];
