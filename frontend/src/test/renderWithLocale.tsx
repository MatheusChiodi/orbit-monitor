import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createI18n, type Locale } from '@/shared/i18n/i18n';

/** Renders `ui` with its own i18n instance in the given locale. */
export function renderWithLocale(ui: ReactElement, locale: Locale): RenderResult {
  const i18n = createI18n(locale);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}
