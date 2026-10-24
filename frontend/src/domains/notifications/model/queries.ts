import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { NotificationsApi } from '../api/notificationsApi';

export interface NotificationsContextValue {
  api: NotificationsApi;
  /** False away from the machine that runs Orbit (view-only access). */
  editable: boolean;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationsSettings');
  return value;
}

/** Query keys of this settings area; everything lives under `notifications`. */
export const keys = {
  all: ['notifications'] as const,
  channels: ['notifications', 'channels'] as const,
  deadLetters: ['notifications', 'dead-letters'] as const,
  templates: ['notifications', 'templates'] as const,
  policies: ['notifications', 'policies'] as const,
  upcoming: ['notifications', 'upcoming'] as const,
  schedules: ['notifications', 'schedules'] as const,
  onCallNow: ['notifications', 'oncall-now'] as const,
  groups: ['notifications', 'groups'] as const,
  monitors: ['notifications', 'monitors'] as const,
};

export function useChannels() {
  const { api } = useNotifications();
  return useQuery({ queryKey: keys.channels, queryFn: api.listChannels });
}

export function useGroupsList() {
  const { api } = useNotifications();
  return useQuery({ queryKey: keys.groups, queryFn: api.listGroups });
}

export function useSchedules() {
  const { api } = useNotifications();
  return useQuery({ queryKey: keys.schedules, queryFn: api.listSchedules });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
