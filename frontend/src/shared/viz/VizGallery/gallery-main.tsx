import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import '@/app/theme.css';
import { createI18n, detectLocale } from '@/shared/i18n/i18n';
import { VizGallery } from './VizGallery';

const locale = detectLocale();
document.documentElement.lang = locale;
const section = new URLSearchParams(window.location.search).get('section') === 'picker' ? 'picker' : 'modes';
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={createI18n(locale)}>
        <VizGallery section={section} />
      </I18nextProvider>
    </StrictMode>,
  );
}
