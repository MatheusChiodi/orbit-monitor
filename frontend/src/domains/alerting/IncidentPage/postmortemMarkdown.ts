import type { TFunction } from 'i18next';
import type { PostmortemRecord } from '@/shared/api/consoleTypes';
import { formatClock, formatDuration } from '@/shared/format';
import { safeText } from '@/shared/privacy/redact';

const line = (label: string, value: string) => `- **${label}:** ${value}`;

/** BE-34 postmortem as Markdown, ready to paste in a ticket or a doc; values pass through the redactor. */
export function postmortemMarkdown(record: PostmortemRecord, t: TFunction): string {
  const none = t('ops.incidents.md.none');
  const at = (value: string | null) => (value ? new Date(value).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : none);
  const span = (seconds: number | null) => (seconds === null ? none : formatDuration(seconds * 1000));
  const name = safeText(record.monitorName);
  return [
    `# ${t('ops.incidents.md.title', { name })}`,
    '',
    line(t('ops.incidents.md.monitor'), name),
    line(t('ops.incidents.md.severity'), record.severity),
    line(t('ops.incidents.md.opened'), at(record.openedAt)),
    line(t('ops.incidents.md.acknowledged'), at(record.acknowledgedAt)),
    line(t('ops.incidents.md.resolved'), at(record.resolvedAt)),
    line(t('ops.incidents.md.mtta'), span(record.timeToAcknowledgeSeconds)),
    line(t('ops.incidents.md.mttr'), span(record.timeToResolveSeconds)),
    line(t('ops.incidents.md.ticket'), record.ticket ? safeText(record.ticket) : none),
    '',
    `## ${t('ops.incidents.md.timeline')}`,
    '',
    ...record.timeline.map((event) => `- ${formatClock(event.at)} · ${event.type}${event.detail ? ` · ${safeText(event.detail)}` : ''}`),
    '',
  ].join('\n');
}

/** File name for the downloaded postmortem: `postmortem-<incident id>.md`. */
export function postmortemFileName(record: PostmortemRecord): string {
  return `postmortem-${record.incidentId.replace(/[^\w-]+/g, '_')}.md`;
}
