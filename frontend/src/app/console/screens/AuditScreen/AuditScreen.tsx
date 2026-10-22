import { useId, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QueryDiff } from '@/domains/monitor/components/QueryDiff';
import type { AuditFilter } from '@/shared/api/consoleTypes';
import { formatClock } from '@/shared/format';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { ActorLabel, Button, CLIENT_KINDS, INPUT_CLASS, LABEL_CLASS, Panel, SELECT_CLASS } from '@/shared/ui';
import { useConsole } from '../../ConsoleContext';
import { ScreenStatus, ScreenTitle } from '../ScreenStatus';
import { toQueryChanges } from './queryChanges';

export const AUDIT_PAGE_SIZE = 50;
const FIELDS = ['action', 'target'] as const;
/** The audit `operator` field now holds the client kind (`loopback`, `lan`, `unknown`): filtered with a select. */
type Draft = Record<(typeof FIELDS)[number] | 'operator', string>;

/** BE-46 / FE-36: `#/audit` — filtered, paged audit trail; a monitor's SELECT history opens as a diff. */
export function AuditScreen() {
  const { t } = useTranslation();
  const { source, demo } = useConsole();
  const ids = { action: useId(), target: useId(), client: useId() };
  const [draft, setDraft] = useState<Draft>({ action: '', target: '', operator: '' });
  const [filter, setFilter] = useState<AuditFilter>({});
  const [page, setPage] = useState(0);
  const [historyOf, setHistoryOf] = useState<string | null>(null);

  const query = { ...filter, limit: AUDIT_PAGE_SIZE, offset: page * AUDIT_PAGE_SIZE };
  const audit = useQuery({ queryKey: ['audit', demo, query], queryFn: () => source.queryAudit(query), placeholderData: keepPreviousData });
  const history = useQuery({
    queryKey: ['audit', demo, 'sql-history', historyOf],
    queryFn: () => source.queryAudit({ action: 'sql.save', target: historyOf ?? undefined }),
    enabled: historyOf !== null,
  });

  const items = audit.data?.items ?? [];
  const total = audit.data?.total ?? null;
  const hasNext = total === null ? items.length === AUDIT_PAGE_SIZE : (page + 1) * AUDIT_PAGE_SIZE < total;

  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setFilter(Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])));
  }

  return (
    <>
      <ScreenTitle>{t('screens.audit.title')}</ScreenTitle>
      <form aria-label={t('screens.audit.filters')} onSubmit={apply} className="flex flex-wrap items-end gap-[0.6rem]">
        {FIELDS.map((field) => (
          <div key={field} className={LABEL_CLASS}>
            <label htmlFor={ids[field]}>{t(`screens.audit.${field}`)}</label>
            <input id={ids[field]} className={INPUT_CLASS} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
          </div>
        ))}
        <div className={LABEL_CLASS}>
          <label htmlFor={ids.client}>{t('screens.audit.client')}</label>
          <select id={ids.client} className={SELECT_CLASS} value={draft.operator} onChange={(e) => setDraft({ ...draft, operator: e.target.value })}>
            <option value="">{t('screens.audit.anyClient')}</option>
            {CLIENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`actor.${kind}`)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary">
          {t('screens.audit.apply')}
        </Button>
      </form>
      <ScreenStatus pending={audit.isPending} error={audit.error} />
      {audit.data && items.length === 0 && <p className="m-0 text-muted">{t('screens.audit.empty')}</p>}
      {items.length > 0 && (
        <table aria-label={t('screens.audit.title')} className="w-full border-collapse text-[0.85rem]">
          <thead className="text-left text-[0.75rem] text-muted">
            <tr>
              {(['at', 'client', 'action', 'target', 'detail'] as const).map((c) => (
                <th key={c} className="py-[0.3rem] pr-[0.6rem]">{t(`screens.audit.columns.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((entry, i) => (
              <tr key={`${entry.at}-${i}`} className="border-t border-line align-top">
                <td className="py-[0.35rem] pr-[0.6rem] font-mono text-[0.75rem] whitespace-nowrap">
                  <time dateTime={entry.at}>{`${entry.at.slice(0, 10)} ${formatClock(entry.at)}`}</time>
                </td>
                <td className="pr-[0.6rem]">
                  <ActorLabel actor={entry.operator} />
                </td>
                <td className="pr-[0.6rem] font-mono">{entry.action}</td>
                <td className="pr-[0.6rem] font-mono">
                  {entry.target && <SafeValue value={entry.target} />}
                  {entry.action === 'sql.save' && entry.target && (
                    <Button variant="ghost" aria-label={t('screens.audit.showHistory', { target: entry.target })} onClick={() => setHistoryOf(entry.target)}>
                      Δ
                    </Button>
                  )}
                </td>
                <td className="max-w-[28rem] truncate font-mono text-[0.75rem] text-muted">{entry.detail && <SafeValue value={entry.detail} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex items-center gap-[0.6rem]">
        <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          {t('screens.audit.previous')}
        </Button>
        <span className="text-[0.85rem] text-muted">{t('screens.audit.page', { page: page + 1 })}</span>
        <Button variant="ghost" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
          {t('screens.audit.next')}
        </Button>
      </div>
      {historyOf && (
        <Panel title={`${t('screens.audit.queryHistory')} · ${historyOf}`}>
          <ScreenStatus pending={history.isPending} error={history.error} />
          {history.data && <QueryDiff changes={toQueryChanges(history.data.items)} />}
        </Panel>
      )}
    </>
  );
}
