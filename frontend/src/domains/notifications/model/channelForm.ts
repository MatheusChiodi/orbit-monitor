import type { Channel, ChannelRequest, ChannelType, MessageLocale, MinSeverity, SmtpSecurity } from '../api/notificationsApi';

/** `Ops on-call` → `ops-on-call`, plus a suffix when taken (ids are file keys, never shown). */
export function newId(name: string, taken: readonly string[] = []): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'item';
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

type Need = 'required' | 'optional';

/** Which inputs each channel kind uses (ChannelDef javadoc, BE-28). */
export interface ChannelShape {
  url?: Need;
  signingSecret?: Need;
  token?: Need;
  recipients?: Need;
  smtp?: true;
  providerTemplate?: true;
}

export const CHANNEL_SHAPE: Record<ChannelType, ChannelShape> = {
  SLACK: { url: 'required' },
  TEAMS: { url: 'required' },
  WEBHOOK: { url: 'required', signingSecret: 'optional' },
  EMAIL: { recipients: 'required', smtp: true, token: 'optional' },
  TELEGRAM: { token: 'required', recipients: 'required', url: 'optional' },
  WHATSAPP: { url: 'required', token: 'required', recipients: 'required', providerTemplate: true },
};

export interface ChannelDraft {
  name: string;
  type: ChannelType;
  enabled: boolean;
  minSeverity: MinSeverity;
  locale: MessageLocale;
  allGroups: boolean;
  groupIds: string[];
  /** Secrets: typed only, never prefilled; empty keeps the stored value. */
  url: string;
  signingSecret: string;
  token: string;
  /** One per line or comma separated; empty on edit keeps the stored (masked) list. */
  recipients: string;
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpFrom: string;
  smtpSecurity: SmtpSecurity;
  providerTemplate: string;
}

export type ChannelField = 'name' | 'url' | 'token' | 'recipients' | 'smtpHost' | 'smtpPort' | 'smtpFrom' | 'groupIds';
/** Field → i18n key under `notificationSettings.channels.errors`. */
export type ChannelErrors = Partial<Record<ChannelField, string>>;

export function draftFromChannel(channel?: Channel, locale: MessageLocale = 'en'): ChannelDraft {
  const groups = channel?.groupIds ?? [];
  return {
    name: channel?.name ?? '',
    type: channel?.type ?? 'SLACK',
    enabled: channel?.enabled ?? true,
    minSeverity: channel?.minSeverity ?? 'WARN',
    locale: channel?.locale ?? locale,
    allGroups: groups.length === 0,
    groupIds: groups,
    url: '',
    signingSecret: '',
    token: '',
    recipients: '',
    smtpHost: channel?.smtp?.host ?? '',
    smtpPort: channel?.smtp?.port != null ? String(channel.smtp.port) : '',
    smtpUsername: channel?.smtp?.username ?? '',
    smtpFrom: channel?.smtp?.from ?? '',
    smtpSecurity: channel?.smtp?.security ?? 'STARTTLS',
    providerTemplate: channel?.providerTemplate ?? '',
  };
}

export function parseRecipients(text: string): string[] {
  return text
    .split(/[\n,;]/)
    .map((r) => r.trim())
    .filter(Boolean);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9]\d{6,14}$/;

/** Stored secret on the channel being edited (the API only says it exists). */
function stored(channel: Channel | undefined, field: 'url' | 'token'): boolean {
  return Boolean(channel?.[field]);
}

export function validateChannel(draft: ChannelDraft, existing?: Channel): ChannelErrors {
  const errors: ChannelErrors = {};
  const shape = CHANNEL_SHAPE[draft.type];
  const sameType = existing?.type === draft.type;
  if (!draft.name.trim()) errors.name = 'name';
  if (shape.url === 'required' && !draft.url.trim() && !(sameType && stored(existing, 'url'))) errors.url = 'url';
  else if (draft.url.trim() && !/^https?:\/\//i.test(draft.url.trim())) errors.url = 'urlFormat';
  if (shape.token === 'required' && !draft.token.trim() && !(sameType && stored(existing, 'token'))) errors.token = 'token';
  const recipients = parseRecipients(draft.recipients);
  if (shape.recipients === 'required' && recipients.length === 0 && !(sameType && (existing?.recipients.length ?? 0) > 0)) {
    errors.recipients = 'recipients';
  } else if (draft.type === 'EMAIL' && recipients.some((r) => !EMAIL.test(r))) errors.recipients = 'emailFormat';
  else if (draft.type === 'WHATSAPP' && recipients.some((r) => !PHONE.test(r))) errors.recipients = 'phoneFormat';
  if (shape.smtp) {
    if (!draft.smtpHost.trim()) errors.smtpHost = 'smtpHost';
    if (!EMAIL.test(draft.smtpFrom.trim())) errors.smtpFrom = 'smtpFrom';
    const port = Number(draft.smtpPort);
    if (draft.smtpPort.trim() && (!Number.isInteger(port) || port < 1 || port > 65535)) errors.smtpPort = 'smtpPort';
  }
  if (!draft.allGroups && draft.groupIds.length === 0) errors.groupIds = 'groups';
  return errors;
}

/** Only typed secrets and recipients are sent: anything left empty keeps what the vault holds. */
export function toChannelRequest(draft: ChannelDraft): ChannelRequest {
  const shape = CHANNEL_SHAPE[draft.type];
  const typed = (value: string) => (value.trim() ? value.trim() : undefined);
  const recipients = parseRecipients(draft.recipients);
  return {
    name: draft.name.trim(),
    type: draft.type,
    enabled: draft.enabled,
    minSeverity: draft.minSeverity,
    locale: draft.locale,
    groupIds: draft.allGroups ? [] : draft.groupIds,
    url: shape.url ? typed(draft.url) : undefined,
    signingSecret: shape.signingSecret ? typed(draft.signingSecret) : undefined,
    token: shape.token ? typed(draft.token) : undefined,
    recipients: shape.recipients && recipients.length > 0 ? recipients : undefined,
    smtp: shape.smtp
      ? {
          host: draft.smtpHost.trim(),
          port: draft.smtpPort.trim() ? Number(draft.smtpPort) : null,
          username: draft.smtpUsername.trim() || null,
          from: draft.smtpFrom.trim(),
          security: draft.smtpSecurity,
        }
      : null,
    providerTemplate: shape.providerTemplate ? draft.providerTemplate.trim() || null : null,
  };
}
