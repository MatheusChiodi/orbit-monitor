import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { Channel, NotificationsApi } from '../api/notificationsApi';
import { NotificationsSettings, type NotificationsTab } from '../NotificationsSettings';

export const slack: Channel = {
  id: 'ops',
  name: 'Ops chat',
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

type Fake = { [K in keyof NotificationsApi]: ReturnType<typeof vi.fn> & NotificationsApi[K] };

export function fakeApi(overrides: Partial<Record<keyof NotificationsApi, unknown>> = {}): Fake {
  const api = {
    listChannels: vi.fn().mockResolvedValue([]),
    saveChannel: vi.fn().mockImplementation(async (id: string, body: Partial<Channel>) => ({ ...slack, ...body, id })),
    deleteChannel: vi.fn().mockResolvedValue(undefined),
    testChannel: vi.fn().mockResolvedValue({ delivered: true, error: null }),
    deadLetters: vi.fn().mockResolvedValue([]),
    listTemplates: vi.fn().mockResolvedValue({ templates: [], variables: [] }),
    saveTemplate: vi.fn().mockResolvedValue(undefined),
    previewTemplate: vi.fn().mockResolvedValue({ title: '', text: '' }),
    resetTemplate: vi.fn().mockResolvedValue(undefined),
    listPolicies: vi.fn().mockResolvedValue([]),
    savePolicy: vi.fn().mockResolvedValue(undefined),
    deletePolicy: vi.fn().mockResolvedValue(undefined),
    upcoming: vi.fn().mockResolvedValue([]),
    listSchedules: vi.fn().mockResolvedValue([]),
    saveSchedule: vi.fn().mockResolvedValue(undefined),
    deleteSchedule: vi.fn().mockResolvedValue(undefined),
    onCallNow: vi.fn().mockResolvedValue([]),
    listGroups: vi.fn().mockResolvedValue([]),
    listMonitors: vi.fn().mockResolvedValue([]),
  };
  for (const [key, value] of Object.entries(overrides)) {
    (api as Record<string, ReturnType<typeof vi.fn>>)[key] = vi.fn().mockResolvedValue(value);
  }
  return api as unknown as Fake;
}

export function renderSettings(api: NotificationsApi, options: { tab?: NotificationsTab; editable?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsSettings api={api} editable={options.editable ?? true} initialTab={options.tab} />
    </QueryClientProvider>,
  );
}
