import { useTranslation } from 'react-i18next';
import type { AccessMode } from '@/shared/api/types';

/** Shown when the API says this client may only view (edits are loopback-only by default). */
export function ViewOnlyBanner({ mode }: { mode: AccessMode }) {
  const { t } = useTranslation();
  if (mode !== 'view-only') return null;
  return (
    <p role="status" className="m-0 rounded-[0.45rem] border border-info/50 bg-info/12 px-[0.8rem] py-[0.5rem] text-[0.85rem] text-info">
      {t('access.viewOnly')}
    </p>
  );
}
