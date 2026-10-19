import { useTranslation } from 'react-i18next';
import { formatClock } from '@/shared/format';
import { safeText } from '@/shared/privacy/redact';
import { Panel } from '@/shared/ui';
import { diffLines } from './diffLines';

export interface QueryChange {
  before: string;
  after: string;
  /** Self-declared operator name (no login). */
  operator: string;
  client: 'loopback' | 'lan' | 'unknown';
  at: string;
}

export interface QueryDiffProps {
  changes: readonly QueryChange[];
}

/** FE-36: side-by-side diff of SELECT changes from the audit trail (never query results). */
export function QueryDiff({ changes }: QueryDiffProps) {
  const { t } = useTranslation();
  if (changes.length === 0) return <p className="m-0 text-[0.85rem] text-muted">{t('diff.empty')}</p>;

  return (
    <div className="flex flex-col gap-[1rem]">
      {changes.map((change) => {
        // Literals in a SELECT can hold card data: mask before diffing so nothing leaks.
        const lines = diffLines(safeText(change.before), safeText(change.after));
        const removed = lines.filter((l) => l.op === 'remove').length;
        const added = lines.filter((l) => l.op === 'add').length;
        return (
          <Panel key={`${change.at}:${change.operator}`}>
            <p className="m-0 flex flex-wrap gap-[0.6rem] text-[0.8rem] text-muted">
              <span>{t('diff.author', { name: change.operator, client: change.client })}</span>
              <span className="font-mono">{formatClock(change.at)}</span>
              <span className="ml-auto">{t('diff.summary', { removed, added })}</span>
            </p>
            <table aria-label={t('diff.table')} className="mt-[0.5rem] w-full border-collapse font-mono text-[0.78rem]">
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="align-top">
                    <td className="w-[2.5rem] pr-[0.4rem] text-right text-dim">{line.left ?? ''}</td>
                    <td className="w-1/2 pr-[0.6rem]">
                      {line.op === 'remove' ? (
                        <del className="block bg-down/12 text-down-text no-underline">− {line.text}</del>
                      ) : line.op === 'equal' ? (
                        <span className="block">{line.text}</span>
                      ) : null}
                    </td>
                    <td className="w-[2.5rem] pr-[0.4rem] text-right text-dim">{line.right ?? ''}</td>
                    <td className="w-1/2">
                      {line.op === 'add' ? (
                        <ins className="block bg-ok/12 text-ok-text no-underline">+ {line.text}</ins>
                      ) : line.op === 'equal' ? (
                        <span className="block">{line.text}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        );
      })}
    </div>
  );
}
