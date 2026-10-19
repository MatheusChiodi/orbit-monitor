import { useEffect, useRef } from 'react';
import type { Incident, MonitorView, Severity, WallSnapshot } from '@/shared/api/types';
import type { Locale } from '@/shared/i18n/i18n';
import { shouldPlay, type SoundSettings } from '../sound';

export interface WallAlertsOptions {
  sound: SoundSettings;
  player: { play: (severity: Severity, volume: number) => void };
  notify: (incident: Incident, monitor: MonitorView, locale: Locale) => boolean;
  locale: Locale;
}

/**
 * Sound (FE-47) for new DOWN/WARN timeline events and desktop notifications (FE-48) for new incidents.
 * The first snapshot only sets the baseline, so opening the wall never beeps for old events.
 */
export function useWallAlerts(snapshot: WallSnapshot | null, options: WallAlertsOptions): void {
  const seenEvents = useRef<Set<string> | null>(null);
  const seenIncidents = useRef<Set<string> | null>(null);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (!snapshot) return;
    const { sound, player, notify, locale } = latest.current;
    if (!seenEvents.current || !seenIncidents.current) {
      seenEvents.current = new Set(snapshot.timeline.map((e) => e.id));
      seenIncidents.current = new Set(snapshot.incidents.map((i) => i.id));
      return;
    }
    for (const event of snapshot.timeline) {
      if (seenEvents.current.has(event.id)) continue;
      seenEvents.current.add(event.id);
      if ((event.kind === 'DOWN' || event.kind === 'WARN') && shouldPlay(event, sound)) player.play(event.kind, sound.volume);
    }
    for (const incident of snapshot.incidents) {
      if (seenIncidents.current.has(incident.id)) continue;
      seenIncidents.current.add(incident.id);
      const monitor = snapshot.monitors.find((m) => m.id === incident.monitorId);
      if (monitor) notify(incident, monitor, locale);
    }
  }, [snapshot]);
}
