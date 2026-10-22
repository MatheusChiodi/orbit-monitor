import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { createI18n, loadLocale } from '@/shared/i18n/i18n';

// jsdom has no matchMedia: a browser-like default (no query matches) that tests can spy on or stub.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string): MediaQueryList =>
      ({
        matches: false,
        media,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
}

// Production renders `m` components inside <MotionProvider> (LazyMotion, features loaded after first
// paint). Component tests mount without that provider, so `m` resolves to the full `motion` component
// here; MotionProvider's own test un-mocks this to check the lazy features.
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, m: actual.motion };
});

// Production entry points load their one language first; tests have both.
await Promise.all([loadLocale('en'), loadLocale('pt-BR')]);

// Components render in English unless a test mounts its own I18nextProvider.
createI18n('en', { global: true });

afterEach(() => {
  cleanup();
});
