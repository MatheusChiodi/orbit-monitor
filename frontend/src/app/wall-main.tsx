import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { loadOperator, normalizeOperatorName, saveOperator } from '@/domains/security/operator';
import { WallApp, operatorName } from '@/domains/wall/WallApp';
import { mockSnapshot } from '@/domains/wall/mock';
import { createApiClient } from '@/shared/api/client';
import { wallLayoutSlug } from '@/shared/api/wallSocket';
import { createI18n, detectLocale } from '@/shared/i18n/i18n';
import './theme.css';

const params = new URLSearchParams(window.location.search);
const scenario = params.get('scenario') === 'ok' ? 'ok' : 'incident';
const layout = wallLayoutSlug(window.location.pathname);

const operator = operatorName(window.location.search, loadOperator());
saveOperator(normalizeOperatorName(operator));

const api = createApiClient({ getOperator: () => operator });
const mock = () => mockSnapshot(scenario);
const locale = detectLocale();
const i18n = createI18n(locale);
document.documentElement.lang = locale;

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <WallApp api={api} operator={operator} mock={mock} layout={layout} />
      </I18nextProvider>
    </StrictMode>,
  );
}
