import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFxLevel } from '../FxProvider';

/** Quiet notice after the frame-time downgrade (FE-06 "Automatic downgrade"). */
export function FxDowngradeNotice() {
  const { t } = useTranslation();
  const fx = useFxLevel();
  const [kept, setKept] = useState(false);
  if (!fx.downgraded || kept) return null;
  const button = 'rounded-[0.4rem] px-[0.6rem] py-[0.25rem] text-info hover:bg-s3 active:scale-[0.98]';
  return (
    <div
      role="status"
      className="fixed right-[1rem] bottom-[1rem] z-20 flex items-center gap-[0.6rem] rounded-[0.6rem] border border-line-2 bg-s2 px-[0.9rem] py-[0.55rem] text-[0.85rem] text-muted"
    >
      <span>{t('fx.downgrade.notice')}</span>
      <button type="button" className={button} onClick={() => setKept(true)}>
        {t('fx.downgrade.keep')}
      </button>
      <button type="button" className={button} onClick={fx.restore}>
        {t('fx.downgrade.retry')}
      </button>
    </div>
  );
}
