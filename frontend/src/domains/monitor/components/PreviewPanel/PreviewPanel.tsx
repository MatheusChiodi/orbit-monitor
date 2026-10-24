import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import type { PreviewResult } from '@/shared/api/types';
import { Button } from '@/shared/ui';
import { PreviewTable } from '../PreviewTable';

export interface PreviewPanelProps {
  previewable: boolean;
  preview: PreviewResult | null;
  error: string | null;
  running: boolean;
  intervalSeconds: number;
  onUseInterval: (seconds: number) => void;
}

/**
 * Live preview beside the target. Its height is reserved and the result scrolls inside it, so running a
 * preview never pushes the rest of the page around.
 */
export function PreviewPanel({ previewable, preview, error, running, intervalSeconds, onUseInterval }: PreviewPanelProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const shimmer = useMotionPreset('enter').level === 'off' ? '' : 'anim-shimmer';
  return (
    <section aria-labelledby={titleId} className="flex min-h-64 min-w-0 flex-col gap-3 rounded-md border border-line bg-s1 p-4 lg:sticky lg:top-4">
      <h2 id={titleId} className="section-label m-0">
        {t('form.preview')}
      </h2>
      <div className="flex max-h-96 min-h-0 flex-col gap-3 overflow-auto">
        {error && (
          <p role="alert" className="m-0 font-mono text-sm break-words text-down-text">
            {error}
          </p>
        )}
        {running && (
          <p role="status" aria-busy="true" data-skeleton className={`m-0 rounded-sm bg-s2 p-3 text-sm text-muted ${shimmer}`}>
            {t('form.running')}
          </p>
        )}
        {!previewable ? (
          <p className="m-0 text-sm text-muted">{t('monitorForm.noPreview')}</p>
        ) : preview && !running ? (
          <>
            {preview.cost && preview.cost.level !== 'NONE' && (
              <div role="note" className="flex flex-wrap items-center gap-3 rounded-sm border border-warn/50 bg-warn/10 px-3 py-2 text-sm text-warn-text">
                <span>{preview.cost.message}</span>
                {preview.cost.suggestedIntervalSeconds > intervalSeconds && (
                  <Button variant="ghost" size="sm" onClick={() => onUseInterval(preview.cost!.suggestedIntervalSeconds)}>
                    {t('monitorForm.useInterval', { seconds: preview.cost.suggestedIntervalSeconds })}
                  </Button>
                )}
              </div>
            )}
            <PreviewTable preview={preview} />
          </>
        ) : (
          !error && !running && <p className="m-0 text-sm text-muted">{t('monitorForm.flow.previewIdle')}</p>
        )}
      </div>
    </section>
  );
}
