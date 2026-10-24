import { describe, expect, it } from 'vitest';
import type { Channel } from '../api/notificationsApi';
import { draftFromChannel, newId, toChannelRequest, validateChannel } from './channelForm';

const slack: Channel = {
  id: 'ops',
  name: 'Ops',
  type: 'SLACK',
  url: '•••• (vault)',
  signingSecret: null,
  token: null,
  recipients: [],
  smtp: null,
  groupIds: [],
  minSeverity: 'WARN',
  enabled: true,
  locale: 'en',
  providerTemplate: null,
};

describe('channelForm', () => {
  it('never prefills secrets or recipients from the API', () => {
    const draft = draftFromChannel({ ...slack, recipients: ['o•••@e•••.com'] });
    expect(draft.url).toBe('');
    expect(draft.recipients).toBe('');
    expect(draft.allGroups).toBe(true);
  });

  it('requires the webhook for a new Slack channel but keeps the stored one on edit', () => {
    const fresh = { ...draftFromChannel(), name: 'Ops' };
    expect(validateChannel(fresh)).toEqual({ url: 'url' });
    expect(validateChannel(draftFromChannel(slack), slack)).toEqual({});
    expect(toChannelRequest(draftFromChannel(slack)).url).toBeUndefined();
  });

  it('asks for the stored secrets again when the kind changes', () => {
    const draft = { ...draftFromChannel(slack), type: 'TELEGRAM' as const };
    expect(validateChannel(draft, slack)).toEqual({ token: 'token', recipients: 'recipients' });
  });

  it('checks e-mail addresses, SMTP and WhatsApp numbers', () => {
    const email = { ...draftFromChannel(), name: 'Mail', type: 'EMAIL' as const, recipients: 'ops@example.com, nope' };
    expect(validateChannel(email)).toEqual({ recipients: 'emailFormat', smtpHost: 'smtpHost', smtpFrom: 'smtpFrom' });
    const wa = { ...draftFromChannel(), name: 'WA', type: 'WHATSAPP' as const, url: 'https://graph.example/msg', token: 't', recipients: '11999999999' };
    expect(validateChannel(wa)).toEqual({ recipients: 'phoneFormat' });
  });

  it('builds the request with only what the kind uses', () => {
    const draft = {
      ...draftFromChannel(),
      name: ' Mail ',
      type: 'EMAIL' as const,
      url: 'https://ignored',
      recipients: 'a@example.com\nb@example.com',
      smtpHost: 'smtp.example.com',
      smtpPort: '465',
      smtpFrom: 'orbit@example.com',
      smtpSecurity: 'TLS' as const,
      allGroups: false,
      groupIds: ['payments'],
    };
    expect(toChannelRequest(draft)).toMatchObject({
      name: 'Mail',
      url: undefined,
      recipients: ['a@example.com', 'b@example.com'],
      smtp: { host: 'smtp.example.com', port: 465, from: 'orbit@example.com', security: 'TLS', username: null },
      groupIds: ['payments'],
    });
  });

  it('a channel limited to groups needs at least one', () => {
    expect(validateChannel({ ...draftFromChannel(slack), allGroups: false }, slack)).toEqual({ groupIds: 'groups' });
  });

  it('derives a free id from the name', () => {
    expect(newId('Ops on-call', ['ops-on-call'])).toBe('ops-on-call-2');
    expect(newId('Plantão')).toBe('plantao');
  });
});
