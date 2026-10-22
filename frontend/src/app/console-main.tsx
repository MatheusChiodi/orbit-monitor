import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { createApiClient } from '@/shared/api/apiClient';
import { connectWall, wallSocketUrl } from '@/shared/api/wallSocket';
import { createCustomizationApi } from '@/shared/customization/api';
import { createI18n, detectLocale, loadLocale } from '@/shared/i18n/i18n';
import { MotionProvider } from '@/shared/motion';
import { forgetLegacyOperator } from '@/shared/preferences/preferences';
import { ConsoleApp } from './console';
import './theme.css';

// The self-declared operator name is retired: drop what older versions left on this device.
forgetLegacyOperator();
const locale = detectLocale();
await loadLocale(locale);
const i18n = createI18n(locale);
const api = createApiClient({ getLocale: () => i18n.language });
const customizationApi = createCustomizationApi();
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
          <ConsoleApp
            api={api}
            connectFeed={connectFeed}
            customizationApi={customizationApi}
            demo={new URLSearchParams(window.location.search).has('demo')}
          />
        </MotionProvider>
      </I18nextProvider>
    </StrictMode>,
  );
}
