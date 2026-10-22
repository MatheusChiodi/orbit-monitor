import { useMemo } from 'react';
import { SettingsScreen } from '@/app/settings/SettingsScreen';
import type { OperatorStore } from '@/domains/security/operator';
import { useConsole } from '../../ConsoleContext';
import { toSettingsApi } from './settingsApi';

/** CORE-19: `#/settings` — workspace defaults and config export/import (dry-run diff first). */
export function SettingsRoute({ operatorStore }: { operatorStore: OperatorStore }) {
  const { source } = useConsole();
  const api = useMemo(() => toSettingsApi(source), [source]);
  return <SettingsScreen api={api} operatorStore={operatorStore} />;
}
