import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCALE_STORAGE_KEY, createI18n } from '../i18n';
import { LanguageSelector } from './LanguageSelector';

afterEach(() => localStorage.clear());

describe('LanguageSelector', () => {
  it('lists English and Português (Brasil) with the active one selected', () => {
    const i18n = createI18n('en');
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>,
    );
    const select = screen.getByRole('combobox', { name: 'Language' });
    expect(select).toHaveValue('en');
    expect(screen.getByRole('option', { name: 'Português (Brasil)' })).toBeInTheDocument();
  });

  it('switches the UI language and persists the choice', async () => {
    const i18n = createI18n('en');
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>,
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pt-BR');
    expect(await screen.findByRole('combobox', { name: 'Idioma' })).toHaveValue('pt-BR');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
  });
});
