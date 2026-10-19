import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WallScreen } from '@/domains/wall/components/WallScreen';
import type { Severity, WallSnapshot } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { Button, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';
import { simulateIncident } from '../layout/simulator';

export interface IncidentSimulatorProps {
  snapshot: WallSnapshot;
  now: Date;
  /** Never called: acknowledging inside a simulation stays local. */
  onAcknowledge?: (incidentId: string) => void;
}

const SEVERITIES: Severity[] = ['DOWN', 'WARN'];
const NO_OP = () => {};

/** FE-17: "what if" preview of the wall with a fake incident; nothing is sent and no alert fires. */
export function IncidentSimulator({ snapshot, now }: IncidentSimulatorProps) {
  const { t } = useTranslation();
  const ids = { monitor: useId(), severity: useId() };
  const [monitorId, setMonitorId] = useState(snapshot.monitors[0]?.id ?? '');
  const [severity, setSeverity] = useState<Severity>('DOWN');
  const [simulated, setSimulated] = useState<WallSnapshot | null>(null);

  return (
    <div className="flex flex-col gap-[0.8rem]">
      <div className="flex flex-wrap items-end gap-[0.6rem]">
        <div className={LABEL_CLASS}>
          <label htmlFor={ids.monitor}>{t('layout.simulator.monitor')}</label>
          <select id={ids.monitor} className={SELECT_CLASS} value={monitorId} onChange={(e) => setMonitorId(e.target.value)}>
            {snapshot.monitors.map((m) => (
              <option key={m.id} value={m.id}>
                {safeText(m.name)}
              </option>
            ))}
          </select>
        </div>
        <div className={LABEL_CLASS}>
          <label htmlFor={ids.severity}>{t('layout.simulator.severity')}</label>
          <select id={ids.severity} className={SELECT_CLASS} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {t(`status.label.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <Button variant="primary" onClick={() => setSimulated(simulateIncident(snapshot, { monitorId, severity, now }))}>
          {t('layout.simulator.run')}
        </Button>
        {simulated && <Button onClick={() => setSimulated(null)}>{t('layout.simulator.reset')}</Button>}
      </div>
      {simulated && (
        <p role="note" className="m-0 rounded-[0.45rem] border border-info/50 bg-info/12 px-[0.6rem] py-[0.35rem] text-[0.85rem] text-info">
          {t('layout.simulator.notice')}
        </p>
      )}
      <div data-simulated={simulated ? 'true' : 'false'} className="overflow-hidden rounded-[0.9rem] border border-line">
        <WallScreen snapshot={simulated ?? snapshot} now={now} connection="mock" freshEventIds={new Set()} onAcknowledge={NO_OP} />
      </div>
    </div>
  );
}
