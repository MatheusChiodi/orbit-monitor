import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConnectionTestResult } from '@/shared/api/consoleTypes';
import { DOT_CLASS, StatusBadge } from '@/shared/ui';

export type ConnectionTestState = { phase: 'testing' } | { phase: 'done'; result: ConnectionTestResult };

/** Last test per connection id, kept for this screen only (a test can take ~10 s when the host is down). */
export function useConnectionTests(test: (id: string) => Promise<ConnectionTestResult>) {
  const [tests, setTests] = useState<Record<string, ConnectionTestState>>({});
  const run = useCallback(
    async (id: string) => {
      setTests((all) => ({ ...all, [id]: { phase: 'testing' } }));
      let result: ConnectionTestResult;
      try {
        result = await test(id);
      } catch (e) {
        result = { ok: false, ms: 0, error: e instanceof Error ? e.message : null };
      }
      setTests((all) => ({ ...all, [id]: { phase: 'done', result } }));
    },
    [test],
  );
  return { tests, run };
}

/** "Testing…", "Connected in 42 ms" or "Couldn't connect. <reason>", announced politely. */
export function ConnectionTestStatus({ state, className = '' }: { state: ConnectionTestState | undefined; className?: string }) {
  const { t } = useTranslation();
  let content;
  if (!state) content = <span className="text-sm text-dim">{t('monitorForm.connections.notTested')}</span>;
  else if (state.phase === 'testing') content = <StatusBadge status="neutral">{t('monitorForm.connections.testing')}</StatusBadge>;
  else if (state.result.ok) content = <StatusBadge status="OK">{t('monitorForm.connections.testOk', { ms: state.result.ms })}</StatusBadge>;
  else
    content = (
      <span className="flex min-w-0 items-start gap-1.5 text-sm text-down-text">
        <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT_CLASS.DOWN}`} />
        <span className="min-w-0 break-words">{t('monitorForm.connections.testFailed', { error: state.result.error ?? '' })}</span>
      </span>
    );
  return (
    <div role="status" aria-live="polite" className={`min-w-0 ${className}`}>
      {content}
    </div>
  );
}
