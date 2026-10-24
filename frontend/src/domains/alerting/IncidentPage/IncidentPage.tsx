import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccessMode, Incident, TimelineEvent } from '@/shared/api/types';
import { formatClock, formatDuration, formatElapsed, formatTime } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { ActorLabel, Badge, Button, Field, PageHeader, Panel, StatusBadge, StatusDot, TextArea, TextInput } from '@/shared/ui';
import { EscalationCountdown } from '../EscalationCountdown';

export interface IncidentComment {
  id: string;
  at: string;
  /** Client kind (`loopback`, `lan`, `unknown`); older comments may hold a name. */
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
  /** Back link shown above the title. */
  eyebrow?: ReactNode;
  /** More header actions after acknowledge / resolve (e.g. "Silence alerts…"). */
  extraActions?: ReactNode;
  /** Notes under the header (e.g. the active silence). */
  banner?: ReactNode;
  /** Actions of the postmortem panel (copy / download Markdown). */
  postmortemActions?: ReactNode;
}

/** FE-39: incident timeline, comments, acknowledge, ticket link and the postmortem once resolved. */
export function IncidentPage({
  incident,
  now,
  mode,
  onAcknowledge,
  onComment,
  onLinkTicket,
  onResolve,
  onReopen,
  nextStep = null,
  eyebrow,
  extraActions,
  banner,
  postmortemActions,
}: IncidentPageProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const impactId = useId();
  const [comment, setComment] = useState('');
  const [ticket, setTicket] = useState(incident.ticket ?? '');
  const resolved = Boolean(incident.resolvedAt);
  const opened = Date.parse(incident.openedAt);
  const editable = mode === 'edit';
  const acknowledged = Boolean(incident.acknowledgedBy);

  const actions = resolved ? (
    <>
      {editable && onReopen && <Button onClick={() => onReopen(incident.id)}>{t('screens.incidents.reopen')}</Button>}
      {extraActions}
    </>
  ) : (
    <>
      <EscalationCountdown escalatesAt={incident.escalatesAt} nextStep={nextStep} now={now} acknowledged={acknowledged} />
      {acknowledged ? (
        // `acknowledgedBy` holds the client kind (or a legacy name): never shown as a person.
        <span className="text-sm text-muted">
          {incident.acknowledgedAt ? t('screens.incidents.acknowledgedAt', { time: formatTime(incident.acknowledgedAt) }) : t('screens.incidents.acknowledged')}
        </span>
      ) : (
        <Button variant="primary" onClick={() => onAcknowledge(incident.id)}>
          {t('ops.incidents.acknowledge')}
        </Button>
      )}
      {editable && onResolve && <Button onClick={() => onResolve(incident.id)}>{t('screens.incidents.resolve')}</Button>}
      {extraActions}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        className="pb-0"
        eyebrow={
          <span className="flex flex-col gap-2">
            {eyebrow}
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={resolved ? 'OK' : incident.severity} />
              <span aria-hidden>·</span>
              <SafeValue value={incident.groupName} />
              <span aria-hidden>·</span>
              <span className="font-mono">{formatElapsed(incident.openedAt, now, locale)}</span>
            </span>
          </span>
        }
        title={<SafeValue value={incident.monitorName} />}
        actions={actions}
      />
      {banner}

      {incident.impact.length > 0 && (
        <section aria-labelledby={impactId} className="flex flex-wrap items-center gap-2">
          <h2 id={impactId} className="section-label m-0">
            {t('ops.incidents.probableImpact')}
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {incident.impact.map((item) => (
              <li key={item}>
                <Badge>
                  <SafeValue value={item} />
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resolved && incident.resolvedAt && (
        <Panel title={t('incident.postmortem')} actions={postmortemActions}>
          <dl className="m-0 grid grid-cols-2 gap-3">
            <div>
              <dt className="section-label">{t('incident.mtta')}</dt>
              <dd className="m-0 font-mono text-lg">
                {incident.acknowledgedAt ? formatDuration(Date.parse(incident.acknowledgedAt) - opened) : '—'}
              </dd>
            </div>
            <div>
              <dt className="section-label">{t('incident.mttr')}</dt>
              <dd className="m-0 font-mono text-lg">{formatDuration(Date.parse(incident.resolvedAt) - opened)}</dd>
            </div>
          </dl>
        </Panel>
      )}

      <Panel title={t('incident.timeline')}>
        <ol aria-label={t('incident.timeline')} className="m-0 flex list-none flex-col gap-1.5 p-0">
          {incident.events.map((event) => (
            <li key={event.id} className="flex items-start gap-2.5">
              <time dateTime={event.at} className="font-mono text-sm text-muted">
                {formatClock(event.at)}
              </time>
              <StatusDot status={event.kind === 'DOWN' || event.kind === 'WARN' || event.kind === 'OK' ? event.kind : 'OK'} className="mt-1.5" />
              <span className="min-w-0">
                <SafeValue value={event.title} className="block text-sm font-semibold" />
                {event.detail && <SafeValue value={event.detail} className="block font-mono text-xs text-muted" />}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('ops.incidents.comments')}>
          {incident.comments.length === 0 ? (
            <p className="m-0 text-sm text-muted">{t('ops.incidents.noComments')}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {incident.comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <ActorLabel actor={c.author} className="font-semibold" />
                  <span className="ml-2 font-mono text-xs text-dim">{formatClock(c.at)}</span>
                  <SafeValue value={c.text} className="block" />
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!comment.trim()) return;
                onComment(incident.id, comment.trim());
                setComment('');
              }}
            >
              <Field label={t('incident.comment')}>
                <TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
              </Field>
              <span>
                <Button type="submit" disabled={!comment.trim()}>
                  {t('incident.addComment')}
                </Button>
              </span>
            </form>
          )}
        </Panel>

        <Panel title={t('ops.incidents.ticketTitle')}>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (ticket.trim()) onLinkTicket(incident.id, ticket.trim());
            }}
          >
            <Field label={t('incident.ticket')} hint={editable ? t('ops.incidents.ticketHint') : undefined} className="min-w-48 flex-1">
              <TextInput value={ticket} disabled={!editable} onChange={(e) => setTicket(e.target.value)} />
            </Field>
            {editable && <Button type="submit">{t('incident.linkTicket')}</Button>}
          </form>
        </Panel>
      </div>
    </div>
  );
}
