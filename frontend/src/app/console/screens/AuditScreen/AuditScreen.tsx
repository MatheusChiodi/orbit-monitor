import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QueryDiff } from '@/domains/monitor/components/QueryDiff';
import type { AuditEntry, AuditFilter } from '@/shared/api/consoleTypes';
import { formatClock } from '@/shared/format';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { ActorLabel, Button, CLIENT_KINDS, Field, PageHeader, Panel, Select, Table, type TableColumn } from '@/shared/ui';
import { useConsole, useMonitors } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import { AUDIT_AREAS, areaPrefix, auditActionLabel } from './auditLabels';
import { toQueryChanges } from './queryChanges';

export const AUDIT_PAGE_SIZE = 50;

interface Filters {
  area: string;
  target: string;
  operator: string;
}

/** BE-46 / FE-36: `#/audit` — filtered, paged audit trail; a query monitor's changes open as a diff. */
export function AuditScreen() {
  const { t } = useTranslation();
  const { source, demo } = useConsole();
  const monitors = useMonitors();
  const [filters, setFilters] = useState<Filters>({ area: '', target: '', operator: '' });
  const [page, setPage] = useState(0);
  const [historyOf, setHistoryOf] = useState<string | null>(null);

  const filter: AuditFilter = Object.fromEntries(
    Object.entries({ action: areaPrefix(filters.area), target: filters.target, operator: filters.operator }).filter(([, v]) => v),
  );
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
  const configured = (monitors.data ?? []).filter((m) => (m.type as string) !== 'SELF');
  const nameOf = (id: string) => configured.find((m) => m.id === id)?.name ?? id;

  const change = (key: keyof Filters) => (value: string) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const columns: TableColumn<AuditEntry>[] = [
    {
      key: 'at',
      header: t('screens.audit.columns.at'),
      mono: true,
      className: 'whitespace-nowrap',
      cell: (e) => <time dateTime={e.at}>{`${e.at.slice(0, 10)} ${formatClock(e.at)}`}</time>,
    },
    { key: 'client', header: t('screens.audit.columns.client'), cell: (e) => <ActorLabel actor={e.operator} /> },
    {
      key: 'action',
      header: t('screens.audit.columns.action'),
      cell: (e) => <span title={e.action}>{auditActionLabel(t, e.action)}</span>,
    },
    {
      key: 'target',
      header: t('screens.audit.columns.target'),
      cell: (e) =>
        e.target && (
          <span className="flex flex-wrap items-center gap-2">
            <SafeValue value={nameOf(e.target)} />
            {e.action === 'sql.save' && (
              <Button size="sm" variant="secondary" aria-label={`${t('ops.audit.viewChange')}: ${safeText(nameOf(e.target))}`} onClick={() => setHistoryOf(e.target)}>
                {t('ops.audit.viewChange')}
              </Button>
            )}
          </span>
        ),
    },
    {
      key: 'detail',
      header: t('screens.audit.columns.detail'),
      mono: true,
      className: 'max-w-md truncate text-muted max-sm:max-w-none max-sm:break-all max-sm:whitespace-normal',
      cell: (e) => e.detail && <SafeValue value={e.detail} />,
    },
  ];

  const from = page * AUDIT_PAGE_SIZE + 1;
  return (
    <>
      <PageHeader title={t('screens.audit.title')} description={t('ops.audit.description')} />
      <form aria-label={t('screens.audit.filters')} onSubmit={(e) => e.preventDefault()} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={t('screens.audit.action')}>
          <Select value={filters.area} onChange={(e) => change('area')(e.target.value)}>
            <option value="">{t('ops.audit.anyAction')}</option>
            {AUDIT_AREAS.map((area) => (
              <option key={area} value={area}>
                {t(`ops.audit.areas.${area}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('ops.audit.monitor')}>
          <Select value={filters.target} onChange={(e) => change('target')(e.target.value)}>
            <option value="">{t('ops.audit.anyMonitor')}</option>
            {configured.map((m) => (
              <option key={m.id} value={m.id}>
                {safeText(m.name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('screens.audit.client')}>
          <Select value={filters.operator} onChange={(e) => change('operator')(e.target.value)}>
            <option value="">{t('screens.audit.anyClient')}</option>
            {CLIENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`actor.${kind}`)}
              </option>
            ))}
          </Select>
        </Field>
      </form>
      <ScreenStatus pending={audit.isPending} error={audit.error} />
      {audit.data && (
        <Table
          caption={t('screens.audit.title')}
          columns={columns}
          rows={items}
          getRowKey={(e) => `${e.at}-${e.action}-${e.target ?? ''}`}
          empty={t('screens.audit.empty')}
        />
      )}
      {(page > 0 || hasNext) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            {t('screens.audit.previous')}
          </Button>
          <span className="text-base text-muted">
            {total === null
              ? t('screens.audit.page', { page: page + 1 })
              : t('ops.audit.range', { from, to: from + items.length - 1, total })}
          </span>
          <Button size="sm" variant="secondary" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            {t('screens.audit.next')}
          </Button>
        </div>
      )}
      {historyOf && (
        <Panel
          title={t('ops.audit.changesOf', { name: safeText(nameOf(historyOf)) })}
          surface="solid"
          className="mt-6"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setHistoryOf(null)}>
              {t('ops.audit.closeChanges')}
            </Button>
          }
        >
          <ScreenStatus pending={history.isPending} error={history.error} />
          {history.data && <QueryDiff changes={toQueryChanges(history.data.items)} />}
        </Panel>
      )}
    </>
  );
}
