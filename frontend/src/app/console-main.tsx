import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { createOperatorStore } from '@/domains/security/operator';
import { createApiClient } from '@/shared/api/client';
import { createI18n, detectLocale, loadLocale } from '@/shared/i18n/i18n';
import { MotionProvider } from '@/shared/motion';
import { ConsoleApp } from './console';
import './theme.css';

const operatorStore = createOperatorStore();
const api = createApiClient({ getOperator: () => operatorStore.getState().name });
const locale = detectLocale();
await loadLocale(locale);
const i18n = createI18n(locale);
document.documentElement.lang = locale;

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <MotionProvider>
          <ConsoleApp api={api} operatorStore={operatorStore} />
        </MotionProvider>
      </I18nextProvider>
    </StrictMode>,
  );
}
