import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { WallCustomization } from '@/domains/customization/WallCustomization';
import { parseAccess } from '@/domains/security/access';
import { WallApp } from '@/domains/wall/WallApp';
import { scheduleFromSearch } from '@/domains/wall/display/nightSchedule';
import { applyViewingScale, scaleFromSearch } from '@/domains/wall/display/viewingScale';
import { isKioskRequested } from '@/domains/wall/kiosk/kioskRequest';
import { createApiCore } from '@/shared/api/client';
import { createCustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore } from '@/shared/customization/store';
import { createTerminologyStore } from '@/shared/customization/terminology';
import { wallLayoutSlug } from '@/shared/api/wallSocket';
import { WALL_NAMESPACES, createI18n, detectLocale, loadLocale } from '@/shared/i18n/i18n';
import { forgetLegacyOperator, loadPreferences } from '@/shared/preferences/preferences';
import './wall.css';

const params = new URLSearchParams(window.location.search);
const scenario = params.get('scenario') === 'ok' ? 'ok' : 'incident';
const layout = wallLayoutSlug(window.location.pathname, window.location.search);

// FE-08: `?scale=` wins over the device preference (FE-50); 3 m otherwise.
applyViewingScale(params.has('scale') ? scaleFromSearch(window.location.search) : (loadPreferences().scale ?? '3m'));
// FE-09: `?night=22:00-06:00`.
const nightMode = scheduleFromSearch(window.location.search);

// The self-declared operator name (and `?operator=`) is retired: drop what older versions left here.
forgetLegacyOperator();

// CORE-15: Problem Details in the wall's language (`i18n` is created below; read lazily per request).
const api = createApiCore({ getLocale: () => i18n.language });
// Feature clients load on first use, off the critical path (wall budget).
const loaders = {
  loadLayout: async (slug: string) => (await import('@/domains/workspace/layout/layoutsApi')).createLayoutsApi().bySlug(slug),
  loadWorkspaceDefaults: async () => (await import('@/shared/api/workspaceDefaults')).fetchWorkspaceDefaults(),
  loadCustomThemes: async () => (await (await import('@/shared/api/configResources')).createConfigClient().list('themes')).items,
  loadEscalation: async (incidentId: string) =>
    (await import('@/domains/alerting/escalation/escalationClient')).createEscalationApi().forIncident(incidentId),
  loadOnCall: async () => (await import('@/domains/alerting/oncall/oncallClient')).createOnCallApi().now(),
  loadHistory: async (monitorId: string, range: { from: Date; to: Date }, resolution: 'raw' | '1m' | '1h') =>
    (await import('@/domains/telemetry/history/historyApi')).fetchHistory(monitorId, range, resolution),
};
// Demo data only when explicitly asked for (`wall.html?demo`); otherwise the wall waits for the server.
const mock = params.has('demo') ? async () => (await import('@/domains/wall/mock')).mockSnapshot(scenario) : undefined;
// CORE-21: the wall only reads customization (workspace, this layout, this device).
const customizationApi = createCustomizationApi();
const customization = createCustomizationStore({ api: customizationApi });
const terminology = createTerminologyStore(customizationApi);
// One /api/access request, shared by Customize mode and the edit-only wall controls.
let access: ReturnType<typeof fetchAccess> | null = null;
const fetchAccess = () => api.getAccess().then(parseAccess);
const wallAccess = () => (access ??= fetchAccess());
const locale = detectLocale();
await loadLocale(locale, WALL_NAMESPACES);
const i18n = createI18n(locale);
document.documentElement.lang = locale;

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <WallCustomization store={customization} terminology={terminology} layoutId={layout ?? null} getAccess={wallAccess}>
          <WallApp api={api} mock={mock} layout={layout} kiosk={isKioskRequested(window.location.search)} nightMode={nightMode} loadAccess={wallAccess} {...loaders} />
        </WallCustomization>
      </I18nextProvider>
    </StrictMode>,
  );
}
