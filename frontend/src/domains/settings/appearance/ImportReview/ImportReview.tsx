import { useId, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrbitTheme, ThemeFix } from '@/shared/theme';
import { Button } from '@/shared/ui';
import { WallPreview } from '../WallPreview';

export interface ImportReviewProps {
  theme: OrbitTheme;
  fixes: readonly ThemeFix[];
  fromVsCode: boolean;
  onSave: (theme: OrbitTheme) => void;
  onCancel: () => void;
}

function Swatch({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono">
      <span aria-hidden="true" className="size-[0.75rem] rounded-[0.2rem] border border-line-2" style={{ background: color }} />
      <span>{color}</span>
    </span>
  );
}

/** FE-04: shows what the contrast guard changed before an imported theme is saved. */
export function ImportReview({ theme, fixes, fromVsCode, onSave, onCancel }: ImportReviewProps) {
  const { t } = useTranslation();
  const titleId = useId();

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="flex max-h-[90vh] w-full max-w-[34rem] flex-col gap-4 overflow-y-auto rounded-[0.9rem] border border-line-2 bg-s1 p-5"
      >
        <h2 id={titleId} className="font-display text-[1.2rem] font-bold text-text">
          {t('theme.import.title')}
        </h2>
        <div>
          <p className="text-[0.95rem] font-semibold text-text">{theme.name}</p>
          {fromVsCode ? <p className="text-[0.78rem] text-muted">{t('theme.import.fromVsCode')}</p> : null}
        </div>
        <WallPreview theme={theme} size="card" />
        {fixes.length === 0 ? (
          <p className="text-[0.82rem] text-muted">{t('theme.import.noFixes')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[0.82rem] text-text">{t('theme.import.fixes', { count: fixes.length })}</p>
            <table className="w-full text-left text-[0.78rem] text-muted">
              <tbody>
                {fixes.map((fix) => (
                  <tr key={fix.token} className="border-t border-line">
                    <th scope="row" className="py-1 pr-3 font-mono font-normal text-text">
                      {fix.token}
                    </th>
                    <td className="py-1 pr-2">
                      <Swatch color={fix.from} />
                    </td>
                    <td aria-hidden="true" className="py-1 pr-2">
                      →
                    </td>
                    <td className="py-1">
                      <Swatch color={fix.to} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('theme.import.cancel')}
          </Button>
          <Button autoFocus variant="primary" onClick={() => onSave(theme)}>
            {t('theme.import.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
