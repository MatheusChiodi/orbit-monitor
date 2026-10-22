import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AccessInfo } from '@/shared/api/types';
import type { ConsoleSource } from './consoleSource';
import type { ConsoleRoute } from './routes';

export interface ConsoleContextValue {
  source: ConsoleSource;
  access: AccessInfo;
  editable: boolean;
  demo: boolean;
  navigate: (route: ConsoleRoute) => void;
}

const Context = createContext<ConsoleContextValue | null>(null);

export function ConsoleProvider({ value, children }: { value: ConsoleContextValue; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useConsole(): ConsoleContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useConsole must be used inside ConsoleProvider');
  return value;
}

/** Query keys carry the demo flag so live and demo data never mix in the cache. */
export function useGroups() {
  const { source, demo } = useConsole();
  return useQuery({ queryKey: ['groups', demo], queryFn: source.listGroups });
}

export function useMonitors() {
  const { source, demo } = useConsole();
  return useQuery({ queryKey: ['monitors', demo], queryFn: source.listMonitors });
}

export function useIncidents() {
  const { source, demo } = useConsole();
  return useQuery({ queryKey: ['incidents', demo], queryFn: () => source.listIncidents(), refetchInterval: 15_000 });
}
