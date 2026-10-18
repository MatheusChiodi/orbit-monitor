import type { Incident } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { Button } from '@/shared/ui';

export interface AcknowledgeButtonProps {
  incident: Incident;
  onAcknowledge: (incidentId: string) => void;
  className?: string;
}

/** Único botão de ação da parede. Depois de clicado vira texto. */
export function AcknowledgeButton({ incident, onAcknowledge, className = '' }: AcknowledgeButtonProps) {
  if (incident.acknowledgedBy) {
    const at = incident.acknowledgedAt ? ` às ${formatTime(incident.acknowledgedAt)}` : '';
    return (
      <p className={`m-0 text-[0.85rem] text-info ${className}`}>{`${incident.acknowledgedBy} reconheceu${at}`}</p>
    );
  }
  return (
    <Button
      variant={incident.severity === 'DOWN' ? 'danger' : 'neutral'}
      onClick={() => onAcknowledge(incident.id)}
      className={className}
    >
      Reconhecer
    </Button>
  );
}
