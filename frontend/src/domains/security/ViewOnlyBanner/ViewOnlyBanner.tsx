import { useTranslation } from 'react-i18next';
import type { AccessMode } from '@/shared/api/types';
import { IconInfo } from '@/shared/ui';

/** Shown when the API says this client may only view (edits are loopback-only by default). */
export function ViewOnlyBanner({ mode }: { mode: AccessMode }) {
  const { t } = useTranslation();
  if (mode !== 'view-only') return null;
  return (
    <p role="status" className="m-0 flex items-start gap-2 rounded-md border border-line bg-s1 px-4 py-2.5 text-sm text-muted">
      <IconInfo size={16} className="mt-0.5 text-accent" />
      <span>{t('access.viewOnly')}</span>
    </p>
  );
}
