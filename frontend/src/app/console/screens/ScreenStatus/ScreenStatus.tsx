import { useTranslation } from 'react-i18next';

export interface ScreenStatusProps {
  pending: boolean;
  error: unknown;
}

/** Loading and failure line shared by the console screens; "unavailable" means the API lacks the endpoint. */
export function ScreenStatus({ pending, error }: ScreenStatusProps) {
  const { t } = useTranslation();
  if (error) {
    const unavailable = error instanceof Error && (error.message === 'unavailable' || /\(404\)/.test(error.message));
    return (
      <p role="alert" className="m-0 text-[0.9rem] text-down-text">
        {unavailable ? t('screens.unavailable') : t('screens.loadError')}
      </p>
    );
  }
  if (pending) return <p className="m-0 text-muted">{t('app.loading')}</p>;
  return null;
}

export function ScreenTitle({ children }: { children: string }) {
  return <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{children}</h1>;
}
