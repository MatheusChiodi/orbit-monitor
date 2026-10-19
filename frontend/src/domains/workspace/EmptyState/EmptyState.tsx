import { motion } from 'motion/react';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { Button } from '@/shared/ui';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** FE-37: helpful empty state ("nothing registered yet" is never an error). */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const enter = useMotionPreset('enter');
  return (
    <motion.div
      initial={enter.initial}
      animate={enter.animate}
      transition={enter.transition}
      data-motion-level={enter.level}
      className="flex flex-col items-start gap-[0.5rem] rounded-[0.9rem] border border-dashed border-line-2 p-[1.2rem]"
    >
      <h3 className="m-0 text-[1rem] font-semibold">{title}</h3>
      <p className="m-0 text-[0.85rem] text-muted">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
