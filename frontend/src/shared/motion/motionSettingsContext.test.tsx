import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnimationLevelProvider } from './animationLevel';
import { settingsFor } from './motionSettings';
import { useMotionPreset, useMotionSettings } from './useMotionPreset';

afterEach(() => {
  for (const key of ['animation', 'motionAttention', 'motionFeedback', 'motionHover']) delete document.documentElement.dataset[key];
  document.documentElement.style.removeProperty('--motion-speed');
});

function wrapper(level: 'standard' | 'off', settings = settingsFor(level)) {
  return ({ children }: { children: ReactNode }) => (
    <AnimationLevelProvider level={level} settings={settings} prefersReducedMotion={false}>
      {children}
    </AnimationLevelProvider>
  );
}

describe('FE-06 settings reach the FE-51 presets', () => {
  it('useMotionSettings exposes the effective settings; defaults follow the level', () => {
    const { result } = renderHook(() => useMotionSettings(), { wrapper: wrapper('standard') });
    expect(result.current).toMatchObject({ intensity: 60, fx: 'low' });
  });

  it('transitions off makes enter instant while the level stays standard', () => {
    const { result } = renderHook(() => useMotionPreset('enter'), { wrapper: wrapper('standard', settingsFor('standard', { transitions: false })) });
    expect(result.current.level).toBe('standard');
    expect(result.current.transition.duration).toBe(0);
    expect(result.current.initial).toBe(false);
  });

  it('marks the document so CSS-only signals follow the switches and the speed', () => {
    renderHook(() => null, { wrapper: wrapper('standard', settingsFor('standard', { attention: false, feedback: false, speed: 0.5 })) });
    const root = document.documentElement;
    expect(root.dataset.motionAttention).toBe('off');
    expect(root.dataset.motionFeedback).toBe('off');
    expect(root.style.getPropertyValue('--motion-speed')).toBe('0.5');
  });
});
