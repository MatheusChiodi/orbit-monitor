import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AcknowledgeButton } from '@/domains/wall/components/AcknowledgeButton';
import type { AccessMode, Incident, TimelineEvent } from '@/shared/api/types';
import { formatClock, formatDuration, formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Badge, Button, INPUT_CLASS, LABEL_CLASS, Panel, StatusDot, TEXT_CLASS } from '@/shared/ui';
import { EscalationCountdown } from '../EscalationCountdown';

export interface IncidentComment {
  id: string;
  at: string;
  /** Self-declared operator name (no login). */
  author: string;
  text: string;
}

export interface IncidentDetail extends Incident {
  monitorName: string;
  groupName: string;
  resolvedAt: string | null;
  ticket: string | null;
  events: TimelineEvent[];
  comments: IncidentComment[];
}

export interface IncidentPageProps {
  incident: IncidentDetail;
  now: Date;
  mode: AccessMode;
  onAcknowledge: (incidentId: string) => void;
  onComment: (incidentId: string, text: string) => void;
  onLinkTicket: (incidentId: string, ticket: string) => void;
  /** Editors only (BE-26): view-only clients may only acknowledge. */
  onResolve?: (incidentId: string) => void;
  onReopen?: (incidentId: string) => void;
  /** FE-40: name of the next escalation step (`/api/incidents/{id}/escalation`). */
  nextStep?: string | null;
}

/** FE-39: incident timeline, comments, acknowledge, ticket link and the postmortem once resolved. */
export function IncidentPage({ incident, now, mode, onAcknowledge, onComment, onLinkTicket, onResolve, onReopen, nextStep = null }: IncidentPageProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const ids = { comment: useId(), ticket: useId() };
  const [comment, setComment] = useState('');
  const [ticket, setTicket] = useState(incident.ticket ?? '');
  const resolved = Boolean(incident.resolvedAt);
  const opened = Date.parse(incident.openedAt);
  const editable = mode === 'edit';

  return (
    <div className="flex flex-col gap-[1rem]">
      <header className="flex flex-col gap-[0.3rem]">
        <span className="flex items-center gap-[0.5rem] text-[0.85rem] text-muted">
          <span className={`font-semibold ${TEXT_CLASS[incident.severity]}`}>{t(`status.label.${incident.severity}`)}</span>
          <span aria-hidden>·</span>
          <SafeValue value={incident.groupName} />
          <span className="ml-auto font-mono">{formatElapsed(incident.openedAt, now, locale)}</span>
        </span>
        <h1 className="m-0 font-display text-[1.8rem] font-bold tracking-tight">
          <SafeValue value={incident.monitorName} />
        </h1>
        <span className="flex flex-wrap gap-[0.4rem]">
          {incident.impact.map((item) => (
            <Badge key={item}>
              <SafeValue value={item} />
            </Badge>
          ))}
        </span>
        {!resolved && (
          <span className="flex flex-wrap items-center gap-[0.8rem]">
            <EscalationCountdown escalatesAt={incident.escalatesAt} nextStep={nextStep} now={now} acknowledged={Boolean(incident.acknowledgedBy)} />
            <AcknowledgeButton incident={incident} onAcknowledge={onAcknowledge} />
            {editable && onResolve && <Button onClick={() => onResolve(incident.id)}>{t('screens.incidents.resolve')}</Button>}
          </span>
        )}
        {resolved && editable && onReopen && (
          <span>
            <Button onClick={() => onReopen(incident.id)}>{t('screens.incidents.reopen')}</Button>
          </span>
        )}
      </header>

      {resolved && incident.resolvedAt && (
        <Panel title={t('incident.postmortem')}>
          <dl className="m-0 grid grid-cols-2 gap-[0.6rem]">
            <div>
              <dt className="section-label">{t('incident.mtta')}</dt>
              <dd className="m-0 font-mono text-[1.1rem]">
                {incident.acknowledgedAt ? formatDuration(Date.parse(incident.acknowledgedAt) - opened) : '—'}
              </dd>
            </div>
            <div>
              <dt className="section-label">{t('incident.mttr')}</dt>
              <dd className="m-0 font-mono text-[1.1rem]">{formatDuration(Date.parse(incident.resolvedAt) - opened)}</dd>
            </div>
          </dl>
        </Panel>
      )}

      <Panel>
        <ol aria-label={t('incident.timeline')} className="m-0 flex list-none flex-col gap-[0.3rem] p-0">
          {incident.events.map((event) => (
            <li key={event.id} className="grid grid-cols-[auto_auto_1fr] items-start gap-x-[0.6rem]">
              <time dateTime={event.at} className="font-mono text-[0.78rem] text-muted">
                {formatClock(event.at)}
              </time>
              <StatusDot status={event.kind === 'DOWN' || event.kind === 'WARN' || event.kind === 'OK' ? event.kind : 'OK'} className="mt-[0.3rem]" />
              <span>
                <SafeValue value={event.title} className="block text-[0.85rem] font-semibold" />
                {event.detail && <SafeValue value={event.detail} className="block font-mono text-[0.72rem] text-muted" />}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel>
        <ul className="m-0 flex list-none flex-col gap-[0.5rem] p-0">
          {incident.comments.map((c) => (
            <li key={c.id} className="text-[0.85rem]">
              <span className="font-semibold">{t('incident.author', { name: c.author })}</span>
              <span className="ml-[0.5rem] font-mono text-[0.72rem] text-dim">{formatClock(c.at)}</span>
              <SafeValue value={c.text} className="block" />
            </li>
          ))}
        </ul>
        {editable && (
        <>
        <div className={`${LABEL_CLASS} mt-[0.6rem]`}>
          <label htmlFor={ids.comment}>{t('incident.comment')}</label>
          <textarea id={ids.comment} className={`${INPUT_CLASS} h-auto min-h-[4rem] py-[0.4rem]`} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <div className="mt-[0.4rem]">
          <Button
            onClick={() => {
              if (!comment.trim()) return;
              onComment(incident.id, comment.trim());
              setComment('');
            }}
          >
            {t('incident.addComment')}
          </Button>
        </div>
        </>
        )}
        <div className="mt-[0.8rem] flex flex-wrap items-end gap-[0.5rem]">
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.ticket}>{t('incident.ticket')}</label>
            <input id={ids.ticket} className={INPUT_CLASS} value={ticket} disabled={mode !== 'edit'} onChange={(e) => setTicket(e.target.value)} />
          </div>
          {mode === 'edit' && (
            <Button onClick={() => ticket.trim() && onLinkTicket(incident.id, ticket.trim())}>{t('incident.linkTicket')}</Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
