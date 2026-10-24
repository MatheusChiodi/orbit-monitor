import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { NotificationCenter } from '@/domains/alerting/NotificationCenter';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { useToast } from '@/shared/ui';
import { useConsole, useIncidents, useMonitors } from '../ConsoleContext';
import { incidentFeed } from './incidentFeed';

/** Subscribes to live incident changes (the wall WebSocket); returns the unsubscribe function. */
export type IncidentFeedConnector = (onChange: () => void) => () => void;

export interface NotificationsBellProps {
  connect?: IncidentFeedConnector;
}

/**
 * FE-38 in the console top bar: the incident feed from `/api/incidents` (polled, and refreshed at once
 * when the WebSocket reports an incident), read marks in memory only, a toast for what arrives later.
 * Demo mode never opens the socket.
 */
export function NotificationsBell({ connect }: NotificationsBellProps) {
  const { t } = useTranslation();
  const { demo } = useConsole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const incidents = useIncidents();
  const monitors = useMonitors();
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);
  const [now, setNow] = useState(() => new Date());

  const names = useMemo(() => new Map((monitors.data ?? []).map((m) => [m.id, m.name])), [monitors.data]);
  const feed = useMemo(
    () => incidentFeed(incidents.data ?? [], names, t).map((n) => ({ ...n, read: read.has(n.id) })),
    [incidents.data, names, t, read],
  );

  useEffect(() => {
    if (!incidents.data) return;
    setNow(new Date());
    if (seen.current === null) {
      // First load: history is in the bell, not in toasts.
      seen.current = new Set(feed.map((n) => n.id));
      return;
    }
    for (const n of feed) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      toast({
        title: <SafeValue value={n.title} />,
        description: n.detail ? <SafeValue value={n.detail} className="font-mono" /> : undefined,
        tone: n.severity,
      });
    }
  }, [incidents.data, feed, toast]);

  useEffect(() => {
    if (!connect || demo) return;
    return connect(() => void queryClient.invalidateQueries({ queryKey: ['incidents', demo] }));
  }, [connect, queryClient, demo]);

  return (
    <NotificationCenter
      notifications={feed}
      now={now}
      onRead={(id) => setRead((current) => new Set(current).add(id))}
      onReadAll={() => setRead(new Set(feed.map((n) => n.id)))}
    />
  );
}
