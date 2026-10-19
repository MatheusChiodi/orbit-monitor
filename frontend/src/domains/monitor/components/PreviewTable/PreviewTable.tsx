import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { AnimatedItem } from '@/shared/ui';
import type { PreviewResult } from '@/shared/api/types';
import { formatDuration } from '@/shared/format';
import { detectSensitive } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { suggestReadMode } from '../../display';

export interface PreviewTableProps {
  preview: PreviewResult;
  maxRows?: number;
}

/** Preview result as a table, with the detected type of each column. */
export function PreviewTable({ preview, maxRows = 50 }: PreviewTableProps) {
  const { t } = useTranslation();
  const enter = useMotionPreset('enter');
  const { columns, rows } = preview;
  const summary = `${t('preview.rows', { count: rows.length })} · ${formatDuration(preview.elapsedMs)}`;
  const mode = t(`readMode.${suggestReadMode(preview)}`);
  const hasCardData = rows.some((row) =>
    columns.some((col) => {
      const dataClass = detectSensitive(row[col.name], col.name);
      return dataClass === 'PCI_PAN' || dataClass === 'PCI_SAD';
    }),
  );
  return (
    <motion.div
      initial={enter.initial}
      animate={enter.animate}
      exit={enter.exit}
      transition={enter.transition}
      data-motion-level={enter.level}
      className="flex min-w-0 flex-col gap-[0.5rem]"
    >
      <div className="flex flex-wrap items-center gap-[0.8rem] text-[0.8rem] text-muted">
        {preview.status !== undefined && (
          <span className="font-mono text-text">{t('preview.httpStatus', { status: preview.status })}</span>
        )}
        <span className="font-mono">{summary}</span>
        <span className="ml-auto text-info">{t('preview.suggestion', { mode })}</span>
      </div>
      {hasCardData && (
        <p role="note" className="m-0 rounded-[0.45rem] border border-warn/50 bg-warn/12 px-[0.6rem] py-[0.35rem] text-[0.8rem] text-warn-text">
          {t('privacy.pciNotice')}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">{t('preview.empty')}</p>
      ) : (
        <div className="overflow-auto rounded-[0.45rem] border border-line">
          <table aria-label={t('preview.label')} className="w-full border-collapse text-[0.8rem]">
            <thead className="bg-s2">
              <tr>
                {columns.map((col) => (
                  <th key={col.name} scope="col" className="px-[0.6rem] py-[0.4rem] text-left font-semibold">
                    <span className="block font-mono">{col.name}</span>
                    <span className="block text-[0.7rem] font-normal text-muted">{t(`preview.columnType.${col.type}`)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
              {rows.slice(0, maxRows).map((row, i) => (
                <AnimatedItem as="tr" key={`${i}:${JSON.stringify(row)}`} className="border-t border-line">
                  {columns.map((col) => {
                    const value = row[col.name];
                    return (
                      <td key={col.name} className="px-[0.6rem] py-[0.35rem] font-mono">
                        {value === null || value === undefined ? (
                          <span className="text-dim">NULL</span>
                        ) : (
                          <SafeValue value={value} field={col.name} />
                        )}
                      </td>
                    );
                  })}
                </AnimatedItem>
              ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
