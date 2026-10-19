import { act, render, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createI18n, type Locale } from '@/shared/i18n/i18n';
import { AnimationLevelProvider, type AnimationLevel } from '@/shared/motion/animationLevel';

export interface MotionRenderOptions {
  reducedMotion?: boolean;
}

/** Renders `ui` at an animation level (and locale); the returned `rerender` keeps both wrappers. */
export function renderWithMotion(
  ui: ReactElement,
  level: AnimationLevel,
  locale: Locale = 'en',
  options: MotionRenderOptions = {},
): RenderResult {
  const i18n = createI18n(locale);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <AnimationLevelProvider level={level} prefersReducedMotion={options.reducedMotion ?? false}>
        {children}
      </AnimationLevelProvider>
    </I18nextProvider>
  );
  return render(ui, { wrapper: Wrapper });
}

/** Lets Motion finish (real timers): 50 ms for `off`, ~500 ms for exits. */
export async function flushMotion(ms = 50): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

function styleOf(el: Element): string {
  return el.getAttribute('style') ?? '';
}

/** Opacity below 1 written inline by Motion (0 at mount, then rising while the enter runs). */
function fadingOpacity(style: string): boolean {
  const match = /opacity:\s*([\d.]+)/.exec(style);
  return match ? Number(match[1]) < 1 : false;
}

/** Motion wrote (or is still running) the enter state: transparent start. */
export function entersAnimated(el: Element): boolean {
  return fadingOpacity(styleOf(el));
}

/** Nothing animates: no transparent start and no translate. */
export function isStatic(el: Element): boolean {
  const style = styleOf(el);
  return !fadingOpacity(style) && !/translate/.test(style);
}
