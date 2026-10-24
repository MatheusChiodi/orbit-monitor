import { describe, expect, it } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import type { PostmortemRecord } from '@/shared/api/consoleTypes';
import { makePan } from '@/test/sensitive';
import { postmortemFileName, postmortemMarkdown } from './postmortemMarkdown';

const t = createI18n('en').t;

const record: PostmortemRecord = {
  incidentId: 'inc/1',
  monitorId: 'shop',
  monitorName: 'Shop',
  groupId: 'web',
  status: 'RESOLVED',
  severity: 'DOWN',
  openedAt: '2026-10-24T10:00:00Z',
  acknowledgedAt: '2026-10-24T10:02:00Z',
  acknowledgedBy: 'loopback',
  resolvedAt: '2026-10-24T10:30:00Z',
  timeToAcknowledgeSeconds: 120,
  timeToResolveSeconds: 1800,
  ticket: 'INC-4821',
  timeline: [{ type: 'OPENED', actor: 'system', at: '2026-10-24T10:00:00Z', detail: 'DOWN' }],
};

describe('postmortem Markdown', () => {
  it('has the title, the facts, MTTA/MTTR and the timeline', () => {
    const md = postmortemMarkdown(record, t);
    expect(md).toMatch(/^# Postmortem: Shop/);
    expect(md).toContain('**Time to acknowledge:** 2min 00s');
    expect(md).toContain('**Ticket:** INC-4821');
    expect(md).toContain('## Timeline');
    expect(md).toContain('OPENED · DOWN');
  });

  it('never carries a card number', () => {
    const pan = makePan();
    const md = postmortemMarkdown({ ...record, monitorName: `Card ${pan}` }, t);
    expect(md).not.toContain(pan);
  });

  it('names the file after the incident', () => {
    expect(postmortemFileName(record)).toBe('postmortem-inc_1.md');
  });
});
