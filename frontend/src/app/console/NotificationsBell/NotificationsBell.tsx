import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { NotificationCenter, Toaster } from '@/domains/alerting/NotificationCenter';
import { useConsole, useIncidents, useMonitors } from '../ConsoleContext';
import { incidentFeed, type FeedNotification } from './incidentFeed';

/** Subscribes to live incident changes (the wall WebSocket); returns the unsubscribe function. */
export type IncidentFeedConnector = (onChange: () => void) => () => void;

export interface NotificationsBellProps {
  connect?: IncidentFeedConnector;
}

/**
 * FE-38 in the console header: the incident feed from `/api/incidents` (polled, and refreshed at once
 * when the WebSocket reports an incident), read marks in memory only, toasts for what arrives later.
 */
export function NotificationsBell({ connect }: NotificationsBellProps) {
  const { t } = useTranslation();
  const { demo } = useConsole();
  const queryClient = useQueryClient();
  const incidents = useIncidents();
  const monitors = useMonitors();
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());
  const [toasts, setToasts] = useState<FeedNotification[]>([]);
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
    const fresh = feed.filter((n) => !seen.current!.has(n.id));
    fresh.forEach((n) => seen.current!.add(n.id));
    if (fresh.length > 0) setToasts((current) => [...current, ...fresh]);
  }, [incidents.data, feed]);

  useEffect(() => {
    if (!connect) return;
    return connect(() => void queryClient.invalidateQueries({ queryKey: ['incidents', demo] }));
  }, [connect, queryClient, demo]);

  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((n) => n.id !== id)), []);

  return (
    <>
      <NotificationCenter
        notifications={feed}
        now={now}
        onRead={(id) => setRead((current) => new Set(current).add(id))}
        onReadAll={() => setRead(new Set(feed.map((n) => n.id)))}
      />
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
