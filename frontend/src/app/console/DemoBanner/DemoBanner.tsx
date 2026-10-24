import { useTranslation } from 'react-i18next';
import { IconInfo } from '@/shared/ui';

/** The current address without `?demo` (other parameters and the hash are kept). */
export function exitDemoHref(location: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location): string {
  const params = new URLSearchParams(location.search);
  params.delete('demo');
  const rest = params.toString();
  return `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`;
}

/** FE-63: demo data is never silent; the banner says so and leads back to the real server. */
export function DemoBanner() {
  const { t } = useTranslation();
  return (
    <div role="note" className="flex min-h-9 flex-wrap items-center justify-center gap-x-2 border-b border-line bg-s2 px-4 py-1.5 text-sm text-muted">
      <IconInfo size={16} className="text-accent" />
      <span>{t('app.demoBanner')}</span>
      <span aria-hidden>·</span>
      <a href={exitDemoHref()} className="font-medium text-accent hover:underline">
        {t('app.exitDemo')}
      </a>
    </div>
  );
}
