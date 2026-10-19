import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Incident } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { Button } from '@/shared/ui';

export interface AcknowledgeButtonProps {
  incident: Incident;
  onAcknowledge: (incidentId: string) => void;
  className?: string;
}

/** The only action button on the wall. Once clicked it cross-fades into text. */
export function AcknowledgeButton({ incident, onAcknowledge, className = '' }: AcknowledgeButtonProps) {
  const { t } = useTranslation();
  const preset = useMotionPreset('enter');
  const fade = {
    initial: preset.level === 'off' ? false : ({ opacity: 0 } as const),
    animate: { opacity: 1 },
    exit: preset.level === 'off' ? {} : { opacity: 0, transition: preset.exit.transition },
    transition: preset.transition,
  };
  const text = incident.acknowledgedAt
    ? t('wall.ack.doneAt', { name: incident.acknowledgedBy ?? '', time: formatTime(incident.acknowledgedAt) })
    : t('wall.ack.done', { name: incident.acknowledgedBy ?? '' });

  return (
    <AnimatePresence initial={false}>
      {incident.acknowledgedBy ? (
        <motion.p key="acknowledged" {...fade} className={`m-0 text-[0.85rem] text-info ${className}`}>
          {text}
        </motion.p>
      ) : (
        <motion.span key="button" {...fade} className={`inline-flex ${className}`}>
          <Button
            variant={incident.severity === 'DOWN' ? 'danger' : 'neutral'}
            onClick={() => onAcknowledge(incident.id)}
            className="w-full"
          >
            {t('wall.ack.button')}
          </Button>
        </motion.span>
      )}
    </AnimatePresence>
  );
}
