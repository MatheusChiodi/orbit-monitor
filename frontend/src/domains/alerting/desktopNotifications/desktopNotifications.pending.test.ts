import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Incident, MonitorView } from '@/shared/api/types';
import { makePan } from '@/test/sensitive';
import { DESKTOP_NOTIFICATIONS_KEY, isOptedIn, notifyIncident, optIn, optOut } from './desktopNotifications';

const NotificationMock = vi.fn() as unknown as typeof Notification & { permission: NotificationPermission; requestPermission: ReturnType<typeof vi.fn> };

const monitor: MonitorView = {
  id: 'reconciliation',
  name: 'Reconciliation queue',
  groupId: 'pay',
  type: 'SQL',
  status: 'DOWN',
  value: 349,
  unit: 'QTY',
  rule: { field: 'QTY', operator: '<', limit: 200 },
  since: '2026-10-18T17:00:00.000Z',
};
const incident: Incident = {
  id: 'inc-1',
  monitorId: 'reconciliation',
  severity: 'DOWN',
  openedAt: '2026-10-18T17:00:00.000Z',
  acknowledgedBy: null,
  acknowledgedAt: null,
  impact: [],
  escalatesAt: null,
};

beforeEach(() => {
  localStorage.clear();
  NotificationMock.permission = 'default';
  NotificationMock.requestPermission = vi.fn().mockResolvedValue('granted');
  vi.stubGlobal('Notification', NotificationMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(NotificationMock).mockClear();
});

describe('FE-48 desktop notifications', () => {
  it('are off until the operator opts in', () => {
    expect(isOptedIn()).toBe(false);
    expect(notifyIncident(incident, monitor, 'en')).toBe(false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('opting in asks for browser permission and remembers the choice on the device', async () => {
    expect(await optIn()).toBe(true);
    expect(NotificationMock.requestPermission).toHaveBeenCalled();
    expect(localStorage.getItem(DESKTOP_NOTIFICATIONS_KEY)).toBe('on');
  });

  it('a denied permission keeps them off', async () => {
    NotificationMock.requestPermission = vi.fn().mockResolvedValue('denied');
    expect(await optIn()).toBe(false);
    expect(isOptedIn()).toBe(false);
  });

  it('a new incident produces one factual notification tagged by incident id', async () => {
    await optIn();
    NotificationMock.permission = 'granted';
    expect(notifyIncident(incident, monitor, 'en')).toBe(true);
    expect(NotificationMock).toHaveBeenCalledWith('Reconciliation queue down', {
      body: 'QTY = 349 · rule QTY < 200',
      tag: 'inc-1',
      silent: true,
    });
  });

  it('is written in pt-BR when the UI is in pt-BR', async () => {
    await optIn();
    NotificationMock.permission = 'granted';
    notifyIncident(incident, monitor, 'pt-BR');
    expect(NotificationMock).toHaveBeenCalledWith('Reconciliation queue fora', expect.objectContaining({ body: 'QTY = 349 · regra QTY < 200' }));
  });

  it('acknowledged incidents are not notified', async () => {
    await optIn();
    NotificationMock.permission = 'granted';
    expect(notifyIncident({ ...incident, acknowledgedBy: 'Ana' }, monitor, 'en')).toBe(false);
  });

  it('never carries card data', async () => {
    await optIn();
    NotificationMock.permission = 'granted';
    const pan = makePan();
    notifyIncident(incident, { ...monitor, name: `Card ${pan}` }, 'en');
    expect(JSON.stringify(vi.mocked(NotificationMock).mock.calls)).not.toContain(pan);
  });

  it('opt-out stops notifications', async () => {
    await optIn();
    optOut();
    expect(isOptedIn()).toBe(false);
  });
});
