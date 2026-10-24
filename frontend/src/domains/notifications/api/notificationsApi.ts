import { ApiError, createApiCore, type ApiClientOptions } from '@/shared/api/client';

/** BE-28 channel kinds. */
export const CHANNEL_TYPES = ['SLACK', 'TEAMS', 'WEBHOOK', 'EMAIL', 'TELEGRAM', 'WHATSAPP'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];
export type MinSeverity = 'WARN' | 'DOWN';
export type MessageLocale = 'en' | 'pt-BR';
export type SmtpSecurity = 'NONE' | 'STARTTLS' | 'TLS';

export interface Smtp {
  host: string;
  port?: number | null;
  username?: string | null;
  from: string;
  security?: SmtpSecurity | null;
}

/** `GET /api/channels`: secrets come back as `•••• (vault)` (or null) and recipients masked. */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  url: string | null;
  signingSecret: string | null;
  token: string | null;
  recipients: string[];
  smtp: Smtp | null;
  groupIds: string[] | null;
  minSeverity: MinSeverity | null;
  enabled: boolean;
  locale: MessageLocale | null;
  providerTemplate: string | null;
}

/** `PUT /api/channels/{id}`: a missing secret or recipient list keeps the stored one. */
export interface ChannelRequest {
  name: string;
  type: ChannelType;
  url?: string;
  signingSecret?: string;
  token?: string;
  recipients?: string[];
  smtp?: Smtp | null;
  groupIds?: string[];
  minSeverity?: MinSeverity;
  enabled?: boolean;
  locale?: MessageLocale;
  providerTemplate?: string | null;
}

export interface TestResult {
  delivered: boolean;
  error: string | null;
}

/** BE-36: a message that was not delivered after the retries (kept in memory until restart). */
export interface DeadLetter {
  channelId: string;
  error: string;
  attempts: number;
}

export type LocalizedText = Partial<Record<MessageLocale, string>>;

export interface Template {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  custom: boolean;
}

export interface TemplateList {
  templates: Template[];
  variables: string[];
}

export interface Rendered {
  title: string;
  text: string;
}

export interface EscalationStep {
  afterMinutes: number;
  channelIds: string[];
  name: string | null;
  onCallScheduleId: string | null;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  steps: EscalationStep[];
  groupIds: string[];
}

export interface PolicyRequest {
  name: string;
  steps: EscalationStep[];
  groupIds: string[];
}

/** `GET /api/escalation/upcoming`: next step of an open, unacknowledged incident. */
export interface UpcomingStep {
  incidentId: string;
  monitorId: string;
  policyId: string;
  policyName: string;
  stepIndex: number;
  stepName: string | null;
  dueAt: string;
  channelIds: string[];
  onCall: string | null;
}

export interface OnCallOverride {
  person: string;
  from: string;
  until: string;
}

export interface OnCallSchedule {
  id: string;
  name: string;
  people: string[];
  start: string;
  shiftHours: number;
  overrides: OnCallOverride[] | null;
  onCallNow: string | null;
  shiftEndsAt: string | null;
}

export interface ScheduleRequest {
  name: string;
  people: string[];
  start: string;
  shiftHours: number;
  overrides?: OnCallOverride[] | null;
}

export interface OnCallNowEntry {
  scheduleId: string;
  name: string;
  person: string;
  shiftEndsAt: string | null;
}

export interface GroupRef {
  id: string;
  name: string;
}

const ISO_DURATION = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

/** A `java.time.Duration` as JSON: ISO-8601 (`PT15M`) or seconds (`900` / `"900.000000000"`), in whole minutes. */
export function minutesOf(value: unknown): number {
  if (typeof value === 'number') return Math.round(value / 60);
  if (typeof value !== 'string') return 0;
  const match = ISO_DURATION.exec(value);
  if (!match) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? Math.round(seconds / 60) : 0;
  }
  const [, d = '0', h = '0', m = '0', s = '0'] = match;
  return Math.round(Number(d) * 1440 + Number(h) * 60 + Number(m) + Number(s) / 60);
}

interface RawStep extends Omit<EscalationStep, 'afterMinutes'> {
  after?: unknown;
  afterMinutes?: number;
}

function toPolicy(raw: Omit<EscalationPolicy, 'steps'> & { steps?: RawStep[] | null }): EscalationPolicy {
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    groupIds: raw.groupIds ?? [],
    steps: (raw.steps ?? []).map((s) => ({
      afterMinutes: s.afterMinutes ?? minutesOf(s.after),
      channelIds: s.channelIds ?? [],
      name: s.name ?? null,
      onCallScheduleId: s.onCallScheduleId ?? null,
    })),
  };
}

/** Notification settings client: channels, delivery failures, templates, escalation and on-call. */
export function createNotificationsApi(options: ApiClientOptions = {}) {
  const { request } = createApiCore(options);
  const enc = encodeURIComponent;
  /** A backend without the feature (404) has nothing configured. */
  async function list<T>(path: string): Promise<T[]> {
    try {
      return (await request<T[] | null>(path)) ?? [];
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return [];
      throw error;
    }
  }

  return {
    listChannels: () => list<Channel>('/api/channels'),
    saveChannel: (id: string, body: ChannelRequest) => request<Channel>(`/api/channels/${enc(id)}`, { method: 'PUT', body }),
    deleteChannel: (id: string) => request<void>(`/api/channels/${enc(id)}`, { method: 'DELETE' }),
    testChannel: (id: string) => request<TestResult>(`/api/channels/${enc(id)}/test`, { method: 'POST' }),
    deadLetters: () => list<DeadLetter>('/api/channels/dead-letters'),

    async listTemplates(): Promise<TemplateList> {
      try {
        return await request<TemplateList>('/api/notification-templates');
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return { templates: [], variables: [] };
        throw error;
      }
    },
    saveTemplate: (id: string, body: { title: LocalizedText; text: LocalizedText }) =>
      request<Template>(`/api/notification-templates/${enc(id)}`, { method: 'PUT', body }),
    previewTemplate: (id: string, locale: MessageLocale) =>
      request<Rendered>(`/api/notification-templates/${enc(id)}/preview`, { method: 'POST', body: { locale } }),
    resetTemplate: (id: string) => request<void>(`/api/notification-templates/${enc(id)}`, { method: 'DELETE' }),

    listPolicies: async () => (await list<Parameters<typeof toPolicy>[0]>('/api/escalation')).map(toPolicy),
    savePolicy: (id: string, body: PolicyRequest) =>
      request<Parameters<typeof toPolicy>[0]>(`/api/escalation/${enc(id)}`, { method: 'PUT', body }).then(toPolicy),
    deletePolicy: (id: string) => request<void>(`/api/escalation/${enc(id)}`, { method: 'DELETE' }),
    upcoming: () => list<UpcomingStep>('/api/escalation/upcoming'),

    listSchedules: () => list<OnCallSchedule>('/api/oncall'),
    saveSchedule: (id: string, body: ScheduleRequest) => request<OnCallSchedule>(`/api/oncall/${enc(id)}`, { method: 'PUT', body }),
    deleteSchedule: (id: string) => request<void>(`/api/oncall/${enc(id)}`, { method: 'DELETE' }),
    onCallNow: () => list<OnCallNowEntry>('/api/oncall/now'),

    listGroups: () => list<GroupRef>('/api/groups'),
    /** Names for the monitors of upcoming escalations. */
    listMonitors: () => list<GroupRef>('/api/monitors'),
  };
}

export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
