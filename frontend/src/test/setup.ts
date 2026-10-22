import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';

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

// Components render in English unless a test mounts its own I18nextProvider.
createI18n('en', { global: true });

afterEach(() => {
  cleanup();
});
