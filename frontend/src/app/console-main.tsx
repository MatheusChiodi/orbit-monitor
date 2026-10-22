import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { createOperatorStore } from '@/domains/security/operator';
import { createApiClient } from '@/shared/api/client';
import { connectWall, wallSocketUrl } from '@/shared/api/wallSocket';
import { createCustomizationApi } from '@/shared/customization/api';
import { createI18n, detectLocale } from '@/shared/i18n/i18n';
import { MotionProvider } from '@/shared/motion';
import { ConsoleApp } from './console';
import './theme.css';

const operatorStore = createOperatorStore();
const locale = detectLocale();
const i18n = createI18n(locale);
const api = createApiClient({ getOperator: () => operatorStore.getState().name, getLocale: () => i18n.language });
const customizationApi = createCustomizationApi({ getOperator: () => operatorStore.getState().name });
document.documentElement.lang = locale;

/** FE-38: incident and timeline messages on the wall socket refresh the console notification feed. */
const connectFeed = (onChange: () => void) => {
  const connection = connectWall({
    url: wallSocketUrl(window.location),
    onMessage: (message) => {
      if (message.type === 'incident' || message.type === 'event' || message.type === 'snapshot') onChange();
    },
  });
  return () => connection.close();
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <MotionProvider>
          <ConsoleApp api={api} operatorStore={operatorStore} connectFeed={connectFeed} customizationApi={customizationApi} />
        </MotionProvider>
      </I18nextProvider>
    </StrictMode>,
  );
}
