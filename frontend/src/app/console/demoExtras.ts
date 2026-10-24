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
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';

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
    acknowledgedBy: 'lan',
    acknowledgedAt: minutesAgo(now, 99),
    ticket: 'INC-4810',
    events: [
      { type: 'OPENED', actor: 'orbit', at: minutesAgo(now, 101), detail: 'DOWN' },
      { type: 'ACKNOWLEDGED', actor: 'lan', at: minutesAgo(now, 99), detail: null },
      { type: 'TICKET_LINKED', actor: 'lan', at: minutesAgo(now, 98), detail: 'INC-4810' },
      { type: 'RESOLVED', actor: 'orbit', at: minutesAgo(now, 95), detail: null },
    ],
    impact: [],
  };
  return [...open, resolved];
}

function demoAudit(now: Date): AuditEntry[] {
  const entry = (minutes: number, operator: 'loopback' | 'lan', detail: string, remoteAddress: string): AuditEntry => ({
    at: minutesAgo(now, minutes),
    operator,
    action: 'sql.save',
    target: 'reconciliation',
    detail,
    remoteAddress,
  });
  return [
    entry(30, 'loopback', 'SELECT COUNT(*) AS QTY\nFROM V_RECONCILIATION_PENDING\nWHERE STATUS = \'PENDING\'', '127.0.0.1'),
    entry(600, 'lan', 'SELECT COUNT(*) AS QTY\nFROM V_RECONCILIATION_PENDING', '192.168.0.20'),
    entry(2000, 'loopback', 'SELECT COUNT(*) FROM V_RECONCILIATION_PENDING', '127.0.0.1'),
  ];
}

// Groups and connections are created by consoleSource's demo branch, next to the demo connection list.
type Extras = Omit<ConsoleEndpoints, 'exportConfig' | 'importConfig' | 'getCatalog' | 'saveGroup' | 'saveConnection' | 'deleteConnection' | 'testConnection'>;

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
  let defaults: WorkspacePreferenceDefaults = { locale: 'en', animation: 'standard', density: 'comfortable' };

  function update(id: string, change: (incident: IncidentRecord, at: string) => IncidentRecord): IncidentRecord {
    const current = incidents.get(id);
    if (!current) throw new Error(`Incident ${id} not found`);
    const next = change(current, new Date().toISOString());
    incidents.set(id, next);
    return next;
  }
  const append = (incident: IncidentRecord, event: IncidentEventRecord) => [...incident.events, event];
  // Demo actions happen in this browser: the server would record the client kind, shown as "This machine".
  const by = 'loopback';

  return {
    getMonitor: async (id) => {
      const status = snapshot.monitors.find((m) => m.id === id);
      if (!status) throw new Error(`Monitor ${id} not found`);
      return { definition: { id, name: status.name, type: status.type }, status, lastResult: null, uptime: null, latency: null, historySince: null };
    },
    listIncidents: async (filter = {}) =>
      [...incidents.values()].filter((i) => (!filter.status || i.status === filter.status) && (!filter.monitorId || i.monitorId === filter.monitorId)),
    getIncident: async (id) => update(id, (i) => i),
    acknowledgeIncidentRecord: async (id) =>
      update(id, (i, at) => ({ ...i, acknowledgedBy: by, acknowledgedAt: at, events: append(i, { type: 'ACKNOWLEDGED', actor: by, at, detail: null }) })),
    resolveIncident: async (id) =>
      update(id, (i, at) => ({ ...i, status: 'RESOLVED', resolvedAt: at, events: append(i, { type: 'RESOLVED', actor: by, at, detail: null }) })),
    reopenIncident: async (id) =>
      update(id, (i, at) => ({ ...i, status: 'OPEN', resolvedAt: null, events: append(i, { type: 'REOPENED', actor: by, at, detail: null }) })),
    getIncidentEscalation: async (id) => {
      const incident = incidents.get(id);
      if (!incident?.escalatesAt || incident.acknowledgedBy || incident.status === 'RESOLVED') return null;
      return { incidentId: id, stepName: 'On-call DBA', dueAt: incident.escalatesAt };
    },
    commentIncident: async (id, text) =>
      update(id, (i, at) => ({ ...i, events: append(i, { type: 'COMMENTED', actor: by, at, detail: text }) })),
    linkIncidentTicket: async (id, ticket) =>
      update(id, (i, at) => ({ ...i, ticket, events: append(i, { type: 'TICKET_LINKED', actor: by, at, detail: ticket }) })),
    listMaintenance: async () => [...maintenance.values()],
    listMaintenanceOccurrences: async ({ from, to }) =>
      [...maintenance.values()]
        .filter((m) => m.start && m.end && m.end > from && m.start < to)
        .map((m) => ({ windowId: m.id, name: m.name ?? null, targets: m.targets ?? null, reason: m.reason ?? null, start: m.start!, end: m.end! })),
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
        (e) =>
          (!filter.action || e.action.startsWith(filter.action)) &&
          (!filter.target || e.target === filter.target) &&
          (!filter.operator || e.operator === filter.operator),
      );
      return { items, total: items.length };
    },
    getHistoryCoverage: async () => ({ oldest: minutesAgo(now, 24 * 60), newest: now.toISOString(), retentionDays: 30, rawWritesEnabled: true }),
    getHistory: async (monitorId, range, resolution) => {
      const from = Date.parse(range.from);
      const to = Date.parse(range.to);
      const step = Math.max(60_000, Math.floor((to - from) / 60));
      const buckets = Array.from({ length: 60 }, (_, i) => ({
        start: new Date(from + i * step).toISOString(), count: 1, ok: i % 17 === 0 ? 0 : 1, warn: 0, down: i % 17 === 0 ? 1 : 0, unknown: 0,
        latencyMin: 100, latencyMax: 300, latencyMean: 150 + ((i * 37) % 90), latencyP95: 280, valueMin: null, valueMax: null, valueMean: 40 + ((i * 13) % 20),
      }));
      const coverage = { oldest: minutesAgo(now, 24 * 60), newest: now.toISOString(), retentionDays: 30, rawWritesEnabled: true };
      return { monitorId, from: range.from, to: range.to, resolution: resolution ?? '1m', coverage, samples: null, buckets };
    },
    getHistorySummary: async (monitorId, range) => {
      const status = snapshot.monitors.find((m) => m.id === monitorId)?.status ?? 'OK';
      const down = status === 'DOWN' ? 6 : status === 'WARN' ? 1 : 0;
      return { ...range, samples: 1440, down, uptimePercent: ((1440 - down) / 1440) * 100, p50: 120, p95: 340, p99: 610 };
    },
    getConfigHealth: async () => [],
    listSavedQueries: async () => [],
    getWorkspaceDefaults: async () => defaults,
    saveWorkspaceDefaults: async (next) => {
      defaults = next;
      return next;
    },
    getSettings: async () => settings,
    saveSettings: async (next) => {
      settings = next;
      return next;
    },
  };
}
