import type { ConsoleEndpoints } from '@/shared/api/consoleEndpoints';
import type {
  AuditEntry,
  DependencyItem,
  IncidentEventRecord,
  IncidentRecord,
  MaintenanceItem,
  OrbitSettingsRecord,
  StatusPageRecord,
} from '@/shared/api/consoleTypes';
import type { WallSnapshot } from '@/shared/api/types';

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

function demoIncidents(snapshot: WallSnapshot, now: Date): IncidentRecord[] {
  const open = snapshot.incidents.map((incident): IncidentRecord => {
    const events: IncidentEventRecord[] = [{ type: 'OPENED', actor: 'orbit', at: incident.openedAt, detail: incident.severity }];
    if (incident.acknowledgedBy && incident.acknowledgedAt) {
      events.push({ type: 'ACKNOWLEDGED', actor: incident.acknowledgedBy, at: incident.acknowledgedAt, detail: null });
    }
    return {
      id: incident.id,
      monitorId: incident.monitorId,
      status: 'OPEN',
      severity: incident.severity,
      openedAt: incident.openedAt,
      resolvedAt: null,
      acknowledgedBy: incident.acknowledgedBy,
      acknowledgedAt: incident.acknowledgedAt,
      ticket: null,
      events,
      escalatesAt: incident.escalatesAt,
      impact: incident.impact,
    };
  });
  const resolved: IncidentRecord = {
    id: 'inc-invoices',
    monitorId: snapshot.monitors[snapshot.monitors.length - 1]?.id ?? 'invoices',
    status: 'RESOLVED',
    severity: 'DOWN',
    openedAt: minutesAgo(now, 101),
    resolvedAt: minutesAgo(now, 95),
    acknowledgedBy: 'R. Lima',
    acknowledgedAt: minutesAgo(now, 99),
    ticket: 'INC-4810',
    events: [
      { type: 'OPENED', actor: 'orbit', at: minutesAgo(now, 101), detail: 'DOWN' },
      { type: 'ACKNOWLEDGED', actor: 'R. Lima', at: minutesAgo(now, 99), detail: null },
      { type: 'TICKET_LINKED', actor: 'R. Lima', at: minutesAgo(now, 98), detail: 'INC-4810' },
      { type: 'RESOLVED', actor: 'orbit', at: minutesAgo(now, 95), detail: null },
    ],
    impact: [],
  };
  return [...open, resolved];
}

function demoAudit(now: Date): AuditEntry[] {
  const entry = (minutes: number, operator: string, detail: string, remoteAddress: string): AuditEntry => ({
    at: minutesAgo(now, minutes),
    operator,
    action: 'sql.save',
    target: 'reconciliation',
    detail,
    remoteAddress,
  });
  return [
    entry(30, 'M. Chiodi', 'SELECT COUNT(*) AS QTY\nFROM V_RECONCILIATION_PENDING\nWHERE STATUS = \'PENDING\'', '127.0.0.1'),
    entry(600, 'R. Lima', 'SELECT COUNT(*) AS QTY\nFROM V_RECONCILIATION_PENDING', '192.168.0.20'),
    entry(2000, 'M. Chiodi', 'SELECT COUNT(*) FROM V_RECONCILIATION_PENDING', '127.0.0.1'),
  ];
}

type Extras = Omit<ConsoleEndpoints, 'exportConfig' | 'importConfig' | 'getCatalog'>;

/** In-memory data for the console screens in demo mode; never persisted, never sent anywhere. */
export function createDemoExtras(snapshot: WallSnapshot, now: Date = new Date()): Extras {
  const incidents = new Map(demoIncidents(snapshot, now).map((i) => [i.id, i]));
  const maintenance = new Map<string, MaintenanceItem>();
  const groupIds = snapshot.groups.map((g) => g.id);
  const dependencies = new Map<string, DependencyItem>(
    groupIds.slice(1).map((id, i) => [`dep-${i}`, { id: `dep-${i}`, upstream: groupIds[0]!, downstream: id }]),
  );
  const pages = new Map<string, StatusPageRecord>();
  let settings: OrbitSettingsRecord = { id: 'default', locale: 'en', historyHours: 24 };

  function update(id: string, change: (incident: IncidentRecord, at: string) => IncidentRecord): IncidentRecord {
    const current = incidents.get(id);
    if (!current) throw new Error(`Incident ${id} not found`);
    const next = change(current, new Date().toISOString());
    incidents.set(id, next);
    return next;
  }
  const append = (incident: IncidentRecord, event: IncidentEventRecord) => [...incident.events, event];

  return {
    listIncidents: async () => [...incidents.values()],
    getIncident: async (id) => update(id, (i) => i),
    acknowledgeIncidentRecord: async (id, by) =>
      update(id, (i, at) => ({ ...i, acknowledgedBy: by, acknowledgedAt: at, events: append(i, { type: 'ACKNOWLEDGED', actor: by, at, detail: null }) })),
    commentIncident: async (id, by, text) =>
      update(id, (i, at) => ({ ...i, events: append(i, { type: 'COMMENTED', actor: by, at, detail: text }) })),
    linkIncidentTicket: async (id, by, ticket) =>
      update(id, (i, at) => ({ ...i, ticket, events: append(i, { type: 'TICKET_LINKED', actor: by, at, detail: ticket }) })),
    listMaintenance: async () => [...maintenance.values()],
    saveMaintenance: async (item) => {
      maintenance.set(item.id, item);
      return item;
    },
    deleteMaintenance: async (id) => {
      maintenance.delete(id);
    },
    listDependencies: async () => [...dependencies.values()],
    saveDependency: async (item) => {
      dependencies.set(item.id, item);
      return item;
    },
    deleteDependency: async (id) => {
      dependencies.delete(id);
    },
    listStatusPages: async () => [...pages.values()],
    saveStatusPage: async (item) => {
      pages.set(item.id, item);
      return item;
    },
    saveGroupOrder: async ({ groupIds, monitors }) => {
      const rank = (id: string) => (groupIds.includes(id) ? groupIds.indexOf(id) : groupIds.length);
      snapshot.groups.sort((a, b) => rank(a.id) - rank(b.id));
      if (monitors) {
        const position = new Map(Object.entries(monitors).flatMap(([groupId, ids]) => ids.map((id, i) => [id, { groupId, i }] as const)));
        for (const monitor of snapshot.monitors) monitor.groupId = position.get(monitor.id)?.groupId ?? monitor.groupId;
        snapshot.monitors.sort((a, b) => (position.get(a.id)?.i ?? 0) - (position.get(b.id)?.i ?? 0));
      }
      return snapshot.groups;
    },
    queryAudit: async (filter) => {
      const items = demoAudit(now).filter(
        (e) => (!filter.action || e.action.startsWith(filter.action)) && (!filter.target || e.target === filter.target),
      );
      return { items, total: items.length };
    },
    getHistoryCoverage: async () => ({ oldest: minutesAgo(now, 24 * 60), newest: now.toISOString(), retentionDays: 30, rawWritesEnabled: true }),
    getHistorySummary: async (monitorId, range) => {
      const status = snapshot.monitors.find((m) => m.id === monitorId)?.status ?? 'OK';
      const down = status === 'DOWN' ? 6 : status === 'WARN' ? 1 : 0;
      return { ...range, samples: 1440, down, uptimePercent: ((1440 - down) / 1440) * 100, p50: 120, p95: 340, p99: 610 };
    },
    getConfigHealth: async () => [],
    getSettings: async () => settings,
    saveSettings: async (next) => {
      settings = next;
      return next;
    },
  };
}
