import { useTranslation } from 'react-i18next';
import { OrbitMark } from '@/domains/workspace/WorkspaceBrand';

export interface WallEmptyProps {
  /** Where the console lives; shown in full because a TV cannot click it. */
  consoleUrl: string;
}

/**
 * Fresh install: nothing is watched yet, so nothing is "operational". One quiet invitation instead of five
 * empty panels and a false 100%.
 */
export function WallEmpty({ consoleUrl }: WallEmptyProps) {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-96 flex-1 items-center justify-center p-6">
      <section aria-labelledby="wall-empty-title" className="flex max-w-xl flex-col items-center gap-4 text-center">
        <OrbitMark className="size-12 opacity-60" />
        <h2 id="wall-empty-title" className="display-wide m-0 text-2xl">
          {t('wall.empty.title')}
        </h2>
        <p className="m-0 text-md text-muted">{t('wall.empty.body')}</p>
        <p className="m-0 flex items-baseline gap-2 text-base">
          <span className="section-label">{t('wall.empty.console')}</span>
          <a href={consoleUrl} className="font-mono text-accent underline-offset-4 hover:underline">
            {consoleUrl}
          </a>
        </p>
      </section>
    </main>
  );
}
