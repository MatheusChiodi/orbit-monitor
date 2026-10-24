import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';

/** A list that failed to load: what happened and a way out. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3">
      <p className="m-0 text-sm text-down-text">{t('notificationSettings.loadFailed')}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {t('notificationSettings.retry')}
      </Button>
    </div>
  );
}
