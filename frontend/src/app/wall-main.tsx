import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { loadOperator, normalizeOperatorName, saveOperator } from '@/domains/security/operator';
import { WallCustomization } from '@/domains/customization/WallCustomization';
import { parseAccess } from '@/domains/security/access';
import { WallApp, operatorName } from '@/domains/wall/WallApp';
import { applyViewingScale, scaleFromSearch, scheduleFromSearch } from '@/domains/wall/display';
import { isKioskRequested } from '@/domains/wall/kiosk';
import { createEscalationApi } from '@/domains/alerting/escalation/escalationApi';
import { createOnCallApi } from '@/domains/alerting/oncall/oncallApi';
import { createLayoutsApi } from '@/domains/workspace/layout/layoutsApi';
import { createApiClient } from '@/shared/api/client';
import { createConfigClient } from '@/shared/api/configResources';
import { createCustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore } from '@/shared/customization/store';
import { createTerminologyStore } from '@/shared/customization/terminology';
import { wallLayoutSlug } from '@/shared/api/wallSocket';
import { fetchWorkspaceDefaults } from '@/shared/api/workspaceDefaults';
import { createI18n, detectLocale, loadLocale } from '@/shared/i18n/i18n';
import { loadPreferences } from '@/shared/preferences/preferences';
import './theme.css';

const params = new URLSearchParams(window.location.search);
const scenario = params.get('scenario') === 'ok' ? 'ok' : 'incident';
const layout = wallLayoutSlug(window.location.pathname, window.location.search);

// FE-08: `?scale=` wins over the device preference (FE-50); 3 m otherwise.
applyViewingScale(params.has('scale') ? scaleFromSearch(window.location.search) : (loadPreferences().scale ?? '3m'));
// FE-09: `?night=22:00-06:00`.
const nightMode = scheduleFromSearch(window.location.search);

const operator = operatorName(window.location.search, loadOperator());
saveOperator(normalizeOperatorName(operator));

const api = createApiClient({ getOperator: () => operator });
const layouts = createLayoutsApi();
const config = createConfigClient();
const escalation = createEscalationApi();
const onCall = createOnCallApi();
const loaders = {
  loadLayout: layouts.bySlug,
  loadWorkspaceDefaults: () => fetchWorkspaceDefaults(),
  loadCustomThemes: async () => (await config.list('themes')).items,
  loadEscalation: escalation.forIncident,
  loadOnCall: onCall.now,
  loadHistory: async (monitorId: string, range: { from: Date; to: Date }, resolution: 'raw' | '1m' | '1h') =>
    (await import('@/domains/telemetry/history/historyApi')).fetchHistory(monitorId, range, resolution),
};
// Demo data loads only when the backend does not answer.
const mock = async () => (await import('@/domains/wall/mock')).mockSnapshot(scenario);
// CORE-21: the wall only reads customization (workspace, this layout, this device).
const customizationApi = createCustomizationApi();
const customization = createCustomizationStore({ api: customizationApi });
const terminology = createTerminologyStore(customizationApi);
const wallAccess = () => api.getAccess().then(parseAccess);
const locale = detectLocale();
await loadLocale(locale);
const i18n = createI18n(locale);
document.documentElement.lang = locale;

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <WallCustomization store={customization} terminology={terminology} layoutId={layout ?? null} getAccess={wallAccess}>
          <WallApp api={api} operator={operator} mock={mock} layout={layout} kiosk={isKioskRequested(window.location.search)} nightMode={nightMode} {...loaders} />
        </WallCustomization>
      </I18nextProvider>
    </StrictMode>,
  );
}
