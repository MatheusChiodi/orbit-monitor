import { useTranslation } from 'react-i18next';
import type { Incident } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { Button } from '@/shared/ui';

export interface AcknowledgeButtonProps {
  incident: Incident;
  onAcknowledge: (incidentId: string) => void;
  className?: string;
}

/** The only action button on the wall. Once clicked it becomes text. */
export function AcknowledgeButton({ incident, onAcknowledge, className = '' }: AcknowledgeButtonProps) {
  const { t } = useTranslation();
  if (incident.acknowledgedBy) {
    const text = incident.acknowledgedAt
      ? t('wall.ack.doneAt', { name: incident.acknowledgedBy, time: formatTime(incident.acknowledgedAt) })
      : t('wall.ack.done', { name: incident.acknowledgedBy });
    return <p className={`m-0 text-[0.85rem] text-info ${className}`}>{text}</p>;
  }
  return (
    <Button
      variant={incident.severity === 'DOWN' ? 'danger' : 'neutral'}
      onClick={() => onAcknowledge(incident.id)}
      className={className}
    >
      {t('wall.ack.button')}
    </Button>
  );
}
