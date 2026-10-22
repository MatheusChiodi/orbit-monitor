import { describe, expect, it, vi } from 'vitest';
import { createConsoleSource, type ConsoleApi } from './consoleSource';

function coreApi(): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    listGroups: vi.fn().mockResolvedValue([]),
    listMonitors: vi.fn().mockResolvedValue([]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
  };
}

describe('console source: extended endpoints', () => {
  it('passes through the API methods it has', async () => {
    const listIncidents = vi.fn().mockResolvedValue([]);
    const source = createConsoleSource({ ...coreApi(), listIncidents }, false);
    await source.listIncidents();
    expect(listIncidents).toHaveBeenCalled();
  });

  it('a method the API lacks rejects instead of inventing data (live mode)', async () => {
    const source = createConsoleSource(coreApi(), false);
    await expect(source.listMaintenance()).rejects.toThrow('unavailable');
  });

  it('demo mode serves incidents in memory and records comments, tickets and acknowledgement', async () => {
    const source = createConsoleSource(coreApi(), true);
    const [first] = await source.listIncidents();
    expect(first?.events[0]?.type).toBe('OPENED');
    const commented = await source.commentIncident(first!.id, 'Ana', 'checking');
    expect(commented.events.at(-1)).toMatchObject({ type: 'COMMENTED', actor: 'Ana', detail: 'checking' });
    const ticketed = await source.linkIncidentTicket(first!.id, 'Ana', 'OPS-1');
    expect(ticketed.ticket).toBe('OPS-1');
    const acked = await source.acknowledgeIncidentRecord(first!.id, 'Ana');
    expect(acked.acknowledgedBy).toBe('Ana');
    expect((await source.getIncident(first!.id)).events).toHaveLength(4);
  });

  it('demo mode keeps maintenance, dependencies and status pages in memory only', async () => {
    const source = createConsoleSource(coreApi(), true);
    await source.saveMaintenance({ id: 'mw', name: 'Deploy', targets: ['payments'], start: 'a', end: 'b' });
    expect((await source.listMaintenance()).map((m) => m.id)).toContain('mw');
    expect((await source.listDependencies()).length).toBeGreaterThan(0);
    await source.saveStatusPage({ id: 'sp', slug: 'payments', title: 'Payments', pub: false, groupIds: ['payments'] });
    expect((await source.listStatusPages()).map((p) => p.slug)).toContain('payments');
    expect(Object.keys(localStorage)).not.toContain('orbit.maintenance');
  });

  it('demo audit returns SELECT versions for the query history diff', async () => {
    const source = createConsoleSource(coreApi(), true);
    const page = await source.queryAudit({ action: 'sql.save' });
    expect(page.items.length).toBeGreaterThanOrEqual(2);
    expect(page.items.every((e) => e.action === 'sql.save')).toBe(true);
  });
});
