import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/shared/ui/Toast';
import { useFxLevel } from '../FxProvider';
import { downgradeNoticed, markDowngradeNoticed } from '../fxDowngrade';

/**
 * FE-52 "Automatic downgrade": the effects step down silently and the choice is remembered per device.
 * The first time on a device the console says so once, in a small self-dismissing toast (the Toast
 * viewport keeps it above any sticky action bar). Renders nothing itself; the wall never mounts it.
 */
export function FxDowngradeNotice() {
  const { t } = useTranslation();
  const { downgraded, restore } = useFxLevel();

  useEffect(() => {
    if (!downgraded || downgradeNoticed()) return;
    markDowngradeNoticed();
    showToast({
      title: t('fx.downgrade.notice'),
      action: { label: t('fx.downgrade.restore'), onClick: restore },
      duration: 8000,
    });
  }, [downgraded, restore, t]);

  return null;
}
