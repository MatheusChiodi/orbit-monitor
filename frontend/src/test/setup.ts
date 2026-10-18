import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';

// Components render in English unless a test mounts its own I18nextProvider.
createI18n('en', { global: true });

afterEach(() => {
  cleanup();
});
