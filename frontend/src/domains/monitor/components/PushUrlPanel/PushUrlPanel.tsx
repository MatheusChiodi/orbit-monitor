import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Dialog, Field, IconCopy, TextInput, useToast } from '@/shared/ui';

export interface PushUrlPanelProps {
  /** The URL right after it was generated (shown once); null when only a new one can be generated. */
  url: string | null;
  /** Generates a new secret URL (`POST /api/monitors/{id}/push-token`); the old one stops working. */
  onRegenerate?: () => Promise<string>;
}

/** The secret push URL: shown once with "Copy", or replaced by a new one after a confirmation. */
export function PushUrlPanel({ url: initial, onRegenerate }: PushUrlPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [url, setUrl] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    if (!onRegenerate) return;
    setBusy(true);
    setError(null);
    try {
      setUrl(await onRegenerate());
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    toast({ title: t('monitorForm.push.copied'), tone: 'OK' });
  }

  return (
    <Card title={t('monitorForm.push.title')} description={url ? t('monitorForm.push.once') : t('monitorForm.push.hidden')}>
      {url && (
        <Field label={t('monitorForm.pushUrl')}>
          <div className="flex min-w-0 gap-2">
            <TextInput readOnly className="min-w-0 flex-1 font-mono" value={url} onFocus={(e) => e.target.select()} />
            <Button variant="secondary" className="shrink-0" onClick={() => void copy()}>
              <IconCopy />
              {t('monitorForm.push.copy')}
            </Button>
          </div>
        </Field>
      )}
      {onRegenerate && (
        <div>
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            {t('monitorForm.push.regenerate')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {t('monitorForm.push.failed', { error })}
        </p>
      )}
      <Dialog
        open={confirming}
        size="sm"
        onClose={() => setConfirming(false)}
        title={t('monitorForm.push.confirmTitle')}
        description={t('monitorForm.push.confirmBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('form.cancel')}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void regenerate()}>
              {t('monitorForm.push.regenerate')}
            </Button>
          </>
        }
      />
    </Card>
  );
}
