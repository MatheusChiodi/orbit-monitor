import { headroom } from '@/domains/monitor/rules';
import type { Group, MonitorView, Status } from '@/shared/api/types';

/**
 * FE-59 Living orb: pure mapping from wall data to what the orb shows (docs/03-design.md §4.2).
 * No WebGL here, so every visual rule is unit-tested.
 */

export type OrbStatus = Status | 'UNKNOWN';

/** A monitor as the orb reads it. The optional fields arrive with the API; the orb degrades without them. */
export type OrbMonitor = Omit<MonitorView, 'status'> & {
  status: OrbStatus;
  /** 1 (low) .. 3 (critical); sets the satellite size. */
  importance?: 1 | 2 | 3;
  /** Check interval; sets the satellite speed and the heartbeat cadence. */
  intervalSeconds?: number;
  /** Last check (ISO); a heartbeat pulse runs to the core right after it. */
  lastCheckAt?: string;
  /** Maintenance window or paused monitor: hollow, dimmed satellite. */
  maintenance?: boolean;
};

export interface OrbRing {
  groupId: string;
  name: string;
  status: OrbStatus;
  radius: number;
  /** 1 normally; slightly thicker while the group has a warning. */
  thickness: number;
  /** Small per-ring tilt about the x axis (radians) for depth. */
  tilt: number;
}

export interface OrbSatellite {
  id: string;
  /** Monitor ids it stands for (more than one when aggregated). */
  monitorIds: string[];
  groupId: string;
  ring: number;
  status: OrbStatus;
  count: number;
  size: number;
  /** Radians per second; 0 when stopped (DOWN) or in maintenance. */
  speed: number;
  baseAngle: number;
  /** 0.82..1 of the ring radius: drifts towards the core as headroom shrinks. */
  radiusFactor: number;
  amberHalo: boolean;
  trail: boolean;
  hollow: boolean;
  intervalSeconds: number;
  lastCheckAt: number | null;
}

export interface OrbCore {
  status: OrbStatus;
  /** 0.35..1 from the 24 h availability. */
  brightness: number;
}

export interface OrbModel {
  core: OrbCore;
  rings: OrbRing[];
  satellites: OrbSatellite[];
  aggregated: boolean;
  counts: { monitors: number; groups: number; OK: number; WARN: number; DOWN: number; UNKNOWN: number; near: number };
}

export const AGGREGATE_ABOVE = 60;
export const NEAR_HEADROOM = 0.25;
const DEFAULT_INTERVAL = 30;
const RING_START = 1.45;
const RING_MAX = 2.5;

const RANK: Record<OrbStatus, number> = { OK: 0, UNKNOWN: 1, WARN: 2, DOWN: 3 };

export function worstOrbStatus(statuses: readonly OrbStatus[]): OrbStatus {
  return statuses.reduce<OrbStatus>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'OK');
}

/** 95 % or less → dim; 100 % → full brightness. */
export function coreBrightness(uptime24h: number): number {
  const t = Math.min(1, Math.max(0, (uptime24h - 95) / 5));
  return 0.35 + 0.65 * t;
}

/** Slow and calm: a 30 s check turns at 0.12 rad/s; faster checks turn faster, within bounds. */
export function satelliteSpeed(intervalSeconds: number): number {
  return Math.min(0.3, Math.max(0.03, 3.6 / Math.max(1, intervalSeconds)));
}

export function satelliteSize(importance: 1 | 2 | 3 = 2, count = 1): number {
  return (0.035 + importance * 0.012) * (1 + Math.log2(Math.max(1, count)) * 0.18);
}

/** Headroom 1+ stays on the ring; 0 sits 18 % closer to the core. */
export function driftFactor(h: number | null): number {
  if (h === null) return 1;
  return 0.82 + 0.18 * Math.min(1, Math.max(0, h));
}

function monitorHeadroom(monitor: OrbMonitor): number | null {
  if (!monitor.rule || monitor.value === null || monitor.status === 'DOWN') return null;
  return headroom(monitor.value, monitor.rule);
}

export interface OrbInput {
  monitors: readonly OrbMonitor[];
  groups: readonly Group[];
  /** Unknown (e.g. the console list): neutral brightness. */
  uptime24h?: number;
}

export function buildOrbModel({ monitors, groups, uptime24h }: OrbInput): OrbModel {
  const used = groups.filter((g) => monitors.some((m) => m.groupId === g.id));
  const step = used.length > 1 ? Math.min(0.34, (RING_MAX - RING_START) / (used.length - 1)) : 0;
  const rings: OrbRing[] = used.map((group, i) => {
    const members = monitors.filter((m) => m.groupId === group.id && !m.maintenance);
    const status = worstOrbStatus(members.map((m) => m.status));
    return {
      groupId: group.id,
      name: group.name,
      status,
      radius: RING_START + i * step,
      thickness: status === 'WARN' ? 1.6 : 1,
      tilt: (i % 2 === 0 ? 1 : -1) * 0.06 * (1 + (i % 3)),
    };
  });

  const aggregated = monitors.length > AGGREGATE_ABOVE;
  const satellites: OrbSatellite[] = [];
  rings.forEach((ring, ringIndex) => {
    const members = monitors.filter((m) => m.groupId === ring.groupId);
    const units = aggregated ? aggregate(members) : members.map((m) => ({ monitors: [m], status: m.status }));
    units.forEach((unit, i) => {
      const lead = unit.monitors[0];
      if (!lead) return;
      const h = unit.monitors.length === 1 ? monitorHeadroom(lead) : null;
      const interval = lead.intervalSeconds ?? DEFAULT_INTERVAL;
      const hollow = unit.monitors.every((m) => m.maintenance);
      const stopped = unit.status === 'DOWN' || hollow;
      satellites.push({
        id: aggregated ? `agg:${ring.groupId}:${unit.status}` : lead.id,
        monitorIds: unit.monitors.map((m) => m.id),
        groupId: ring.groupId,
        ring: ringIndex,
        status: unit.status,
        count: unit.monitors.length,
        size: satelliteSize(lead.importance, unit.monitors.length),
        speed: stopped ? 0 : satelliteSpeed(interval),
        baseAngle: (Math.PI * 2 * i) / units.length + ringIndex * 0.7,
        radiusFactor: driftFactor(h),
        amberHalo: h !== null && h < NEAR_HEADROOM,
        trail: unit.status === 'DOWN',
        hollow,
        intervalSeconds: interval,
        lastCheckAt: lead.lastCheckAt ? Date.parse(lead.lastCheckAt) : null,
      });
    });
  });

  const counts = { monitors: monitors.length, groups: rings.length, OK: 0, WARN: 0, DOWN: 0, UNKNOWN: 0, near: 0 };
  for (const m of monitors) {
    counts[m.status] += 1;
    const h = monitorHeadroom(m);
    if (h !== null && h < NEAR_HEADROOM) counts.near += 1;
  }

  return {
    core: { status: worstOrbStatus(monitors.filter((m) => !m.maintenance).map((m) => m.status)), brightness: uptime24h === undefined ? 0.85 : coreBrightness(uptime24h) },
    rings,
    satellites,
    aggregated,
    counts,
  };
}

function aggregate(members: readonly OrbMonitor[]): { monitors: OrbMonitor[]; status: OrbStatus }[] {
  const byStatus = new Map<OrbStatus, OrbMonitor[]>();
  for (const m of members) byStatus.set(m.status, [...(byStatus.get(m.status) ?? []), m]);
  return (['DOWN', 'WARN', 'UNKNOWN', 'OK'] as const)
    .filter((s) => byStatus.has(s))
    .map((status) => ({ monitors: byStatus.get(status) ?? [], status }));
}

/** Angle of a satellite at `seconds` (stopped satellites keep their base angle). */
export function satelliteAngle(satellite: OrbSatellite, seconds: number): number {
  return satellite.baseAngle + satellite.speed * seconds;
}

/** Position in the orb plane (before the scene tilt): x right, y up, z towards the viewer. */
export function satellitePosition(satellite: OrbSatellite, ring: OrbRing, seconds: number): [number, number, number] {
  const angle = satelliteAngle(satellite, seconds);
  const r = ring.radius * satellite.radiusFactor;
  return [Math.cos(angle) * r, -Math.sin(angle) * r * Math.sin(ring.tilt), Math.sin(angle) * r * Math.cos(ring.tilt)];
}

export const PULSE_MS = 1_200;

/** Heartbeat pulse progress (0..1) right after a check, else null. Without `lastCheckAt`, follows the interval. */
export function heartbeatProgress(satellite: OrbSatellite, nowMs: number): number | null {
  if (satellite.speed === 0) return null;
  let since: number;
  if (satellite.lastCheckAt !== null) since = nowMs - satellite.lastCheckAt;
  else {
    const period = satellite.intervalSeconds * 1000;
    const offset = (hash(satellite.id) % 1000) / 1000;
    since = (((nowMs + offset * period) % period) + period) % period;
  }
  return since >= 0 && since < PULSE_MS ? since / PULSE_MS : null;
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Keyboard order: ring by ring, then around each ring. Wraps at both ends. */
export function nextSatellite(model: OrbModel, currentId: string | null, direction: 1 | -1): string | null {
  const ordered = [...model.satellites].sort((a, b) => a.ring - b.ring || a.baseAngle - b.baseAngle);
  if (ordered.length === 0) return null;
  const index = ordered.findIndex((s) => s.id === currentId);
  if (index === -1) return (direction === 1 ? ordered[0] : ordered[ordered.length - 1])?.id ?? null;
  return ordered[(index + direction + ordered.length) % ordered.length]?.id ?? null;
}
