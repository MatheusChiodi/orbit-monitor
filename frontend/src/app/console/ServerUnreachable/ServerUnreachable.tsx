import { useTranslation } from 'react-i18next';
import { Button, IconAlert } from '@/shared/ui';

interface ServerUnreachableProps {
  onRetry: () => void;
  retrying?: boolean;
}

/** `?demo` on the current address: the console's in-memory demo data. */
function demoHref(): string {
  const params = new URLSearchParams(window.location.search);
  params.delete('demo');
  const rest = params.toString();
  return `${window.location.pathname}?demo${rest ? `&${rest}` : ''}${window.location.hash}`;
}

/**
 * Shown when the Orbit server does not answer: the console never fills the gap with invented data.
 * One next step (start the server, then retry) and an explicit way into demo data.
 */
export function ServerUnreachable({ onRetry, retrying = false }: ServerUnreachableProps) {
  const { t } = useTranslation();
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4">
      <div role="alert" className="flex w-full max-w-lg flex-col gap-5 rounded-lg border border-line bg-s1 p-6 shadow-panel">
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-down/12 text-down-text">
            <IconAlert size={20} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="display-wide m-0 text-lg text-text">{t('app.unreachable.title')}</h1>
            <p className="m-0 text-base text-muted">{t('app.unreachable.detail')}</p>
          </div>
        </div>
        <p className="m-0 rounded-md border border-line bg-s2 px-4 py-3 text-base text-text">{t('app.unreachable.nextStep')}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a href={demoHref()} className="ui-control inline-flex h-9 items-center rounded-sm px-3 text-base font-medium text-accent hover:bg-s2">
            {t('app.unreachable.demo')}
          </a>
          <Button variant="primary" onClick={onRetry} loading={retrying}>
            {t('app.unreachable.retry')}
          </Button>
        </div>
      </div>
    </main>
  );
}
