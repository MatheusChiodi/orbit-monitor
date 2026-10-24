import { useTranslation } from 'react-i18next';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `08:12` below one hour, `1:02:03` above; never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
}

/** The last minute turns amber (with the same text, so not only color). */
const URGENT_MS = 60_000;

export interface EscalationCountdownProps {
  escalatesAt: string | null;
  nextStep: string | null;
  now: Date;
  acknowledged: boolean;
}

/** FE-40: "Escalates in 08:12" until the next escalation step; hidden once acknowledged. */
export function EscalationCountdown({ escalatesAt, nextStep, now, acknowledged }: EscalationCountdownProps) {
  const { t } = useTranslation();
  if (acknowledged || !escalatesAt) return null;
  const remaining = Date.parse(escalatesAt) - now.getTime();
  const step = nextStep ?? '';
  const urgent = remaining <= URGENT_MS;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        role="timer"
        aria-label={t('incident.escalation')}
        aria-live="off"
        data-urgent={urgent ? 'true' : 'false'}
        className={`font-mono text-base ${urgent ? 'text-warn-text' : 'text-muted'}`}
      >
        {remaining > 0
          ? t('incident.escalatesIn', { time: formatCountdown(remaining) })
          : t('incident.escalatedTo', { step })}
      </span>
      {remaining > 0 && nextStep && <span className="text-xs text-dim">{t('incident.nextStep', { step })}</span>}
    </span>
  );
}
