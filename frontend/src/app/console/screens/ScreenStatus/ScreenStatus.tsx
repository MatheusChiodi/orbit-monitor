import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, IconAlert, PageHeader } from '@/shared/ui';

export interface ScreenStatusProps {
  pending: boolean;
  error: unknown;
  /** Shows "Try again" on a load error (usually the query's `refetch`). */
  onRetry?: () => void;
  /** Skeleton rows while loading. */
  rows?: number;
}

function isUnavailable(error: unknown): boolean {
  return error instanceof Error && (error.message === 'unavailable' || /\(404\)/.test(error.message));
}

/** Static placeholder rows (no looping animation in the console); announced once as "Loading…". */
export function ScreenSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex flex-col gap-2" data-testid="screen-skeleton">
      <span className="sr-only">{t('app.loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="flex h-12 items-center gap-3 rounded-md border border-line bg-s1 px-4">
          <span className="size-2 rounded-full bg-s3" />
          <span className="h-2.5 w-1/3 rounded-sm bg-s3" />
          <span className="ml-auto h-2.5 w-16 rounded-sm bg-s2" />
        </div>
      ))}
    </div>
  );
}

/**
 * Loading and failure states shared by the console screens: a skeleton while loading; on error what
 * happened and a retry. "Unavailable" means this Orbit server lacks the endpoint (nothing to retry).
 */
export function ScreenStatus({ pending, error, onRetry, rows }: ScreenStatusProps) {
  const { t } = useTranslation();
  if (error) {
    const unavailable = isUnavailable(error);
    return (
      <div role="alert">
        <EmptyState
          icon={IconAlert}
          title={unavailable ? t('screens.unavailable') : t('screens.loadError')}
          action={
            onRetry && !unavailable ? (
              <Button variant="secondary" onClick={onRetry}>
                {t('screens.shell.retry')}
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  if (pending) return <ScreenSkeleton rows={rows} />;
  return null;
}

export interface ScreenTitleProps {
  children: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}

/** The screen's h1; same as `PageHeader` (kept for the screens that already use it). */
export function ScreenTitle({ children, description, actions, eyebrow }: ScreenTitleProps) {
  return <PageHeader title={children} description={description} actions={actions} eyebrow={eyebrow} />;
}
