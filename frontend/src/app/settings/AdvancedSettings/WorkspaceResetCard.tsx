import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Dialog, useToast } from '@/shared/ui';

export interface WorkspaceResetCardProps {
  /** `POST /api/workspace/reset`. */
  reset: () => Promise<unknown>;
  /** Reloads what the reset changed (defaults, customization, terminology). */
  onDone: () => void;
}

/** Settings › Advanced: puts workspace defaults, workspace customization and terminology back to the built-in values. */
export function WorkspaceResetCard({ reset, onDone }: WorkspaceResetCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await reset();
      onDone();
      toast({ title: t('settingsHub.reset.done'), tone: 'OK' });
    } catch (e) {
      toast({ title: t('settingsHub.reset.failed', { message: e instanceof Error ? e.message : String(e) }), tone: 'DOWN' });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Card title={t('settingsHub.reset.title')} description={t('settingsHub.reset.hint')}>
      <div>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          {t('settingsHub.reset.action')}
        </Button>
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        title={t('settingsHub.reset.confirmTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('settingsHub.reset.cancel')}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void run()}>
              {t('settingsHub.reset.confirm')}
            </Button>
          </>
        }
      >
        <p className="m-0 text-base text-muted">{t('settingsHub.reset.hint')}</p>
      </Dialog>
    </Card>
  );
}
