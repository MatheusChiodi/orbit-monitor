import { useTranslation } from 'react-i18next';
import { INPUT_CLASS, SecretInput } from '@/shared/ui';
import type { MonitorFormState } from '../../form';
import { FormField } from '../FormField';

export interface OAuthFieldsProps {
  state: MonitorFormState;
  onChange: (patch: Partial<MonitorFormState>) => void;
  /** A client secret is already sealed in the vault (editing). */
  secretStored?: boolean;
}

/** BE-08: optional OAuth2 client-credentials auth for HTTP monitors; the secret is write-only (CORE-16). */
export function OAuthFields({ state, onChange, secretStored = false }: OAuthFieldsProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="m-0 flex flex-col gap-[0.6rem] rounded-[0.6rem] border border-line p-[0.7rem]">
      <legend className="px-[0.3rem] text-[0.8rem] text-muted">{t('monitorForm.auth')}</legend>
      <div role="radiogroup" aria-label={t('monitorForm.auth')} className="flex flex-wrap gap-[0.8rem] text-[0.85rem]">
        {(['none', 'oauth2'] as const).map((auth) => (
          <label key={auth} className="flex items-center gap-[0.35rem]">
            <input type="radio" name="monitor-auth" checked={state.auth === auth} onChange={() => onChange({ auth })} />
            {t(auth === 'none' ? 'monitorForm.authNone' : 'monitorForm.authOAuth2')}
          </label>
        ))}
      </div>
      {state.auth === 'oauth2' && (
        <div className="grid grid-cols-1 gap-[0.6rem] sm:grid-cols-2">
          <FormField label={t('monitorForm.tokenUrl')}>
            {(id) => (
              <input id={id} className={`${INPUT_CLASS} font-mono`} placeholder="https://idp.example/oauth/token" value={state.tokenUrl} onChange={(e) => onChange({ tokenUrl: e.target.value })} />
            )}
          </FormField>
          <FormField label={t('monitorForm.clientId')}>
            {(id) => <input id={id} className={`${INPUT_CLASS} font-mono`} value={state.clientId} onChange={(e) => onChange({ clientId: e.target.value })} />}
          </FormField>
          <SecretInput label={t('monitorForm.clientSecret')} stored={secretStored} onChange={(clientSecret) => onChange({ clientSecret })} />
          <FormField label={t('monitorForm.scope')}>
            {(id) => <input id={id} className={`${INPUT_CLASS} font-mono`} value={state.scope} onChange={(e) => onChange({ scope: e.target.value })} />}
          </FormField>
        </div>
      )}
    </fieldset>
  );
}
