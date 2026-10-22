import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';

interface ServerUnreachableProps {
  onRetry: () => void;
  retrying?: boolean;
}

/** Shown when the Orbit server does not answer: the console never fills the gap with invented data. */
export function ServerUnreachable({ onRetry, retrying = false }: ServerUnreachableProps) {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[1rem] p-[1.4rem] text-center">
      <div role="alert" className="grid max-w-[34rem] gap-[0.5rem]">
        <h1 className="m-0 text-[1.2rem] font-semibold">{t('app.unreachable.title')}</h1>
        <p className="m-0 text-muted">{t('app.unreachable.detail')}</p>
      </div>
      <Button onClick={onRetry} disabled={retrying}>
        {t('app.unreachable.retry')}
      </Button>
    </main>
  );
}
