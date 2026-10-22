import { useEffect } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAnimationLevel, type AnimationLevel } from '@/shared/motion/animationLevel';
import { applyMotionSettings, settingsFor } from '@/shared/motion/motionSettings';
import { motionPreset } from '@/shared/motion/presets';
import { useMotionSettings } from '@/shared/motion/useMotionPreset';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { StatusDot } from '@/shared/ui';
import type { AppNotification } from './NotificationCenter';

export interface ToasterProps {
  toasts: readonly AppNotification[];
  onDismiss: (id: string) => void;
  animationLevel?: AnimationLevel;
  durationMs?: number;
}

function Toast({ toast, onDismiss, level, durationMs }: { toast: AppNotification; onDismiss: (id: string) => void; level: AnimationLevel; durationMs: number }) {
  const contextSettings = useMotionSettings();
  const settings = level === 'off' ? settingsFor('off') : contextSettings;
  const preset = applyMotionSettings(motionPreset(level, 'toast'), 'toast', settings, level);
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss, durationMs]);
  return (
    <m.div
      role="status"
      data-animation={level}
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={preset.transition}
      className="flex items-start gap-[0.5rem] rounded-[0.6rem] border border-line-2 bg-s1 p-[0.6rem] shadow-xl"
    >
      <StatusDot status={toast.severity} className="mt-[0.35rem]" />
      <span className="min-w-0">
        <SafeValue value={toast.title} className="block text-[0.85rem] font-semibold" />
        {toast.detail && <SafeValue value={toast.detail} className="block font-mono text-[0.72rem] text-muted" />}
      </span>
    </m.div>
  );
}

/** Toasts for new incidents: a polite live region; each toast auto-dismisses. */
export function Toaster({ toasts, onDismiss, animationLevel, durationMs = 6000 }: ToasterProps) {
  const { t } = useTranslation();
  const contextLevel = useAnimationLevel();
  const level = animationLevel ?? contextLevel;
  return (
    <section
      aria-label={t('notifications.region')}
      aria-live="polite"
      className="pointer-events-none fixed right-[1rem] bottom-[1rem] z-50 flex w-[min(22rem,90vw)] flex-col gap-[0.5rem]"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} level={level} durationMs={durationMs} />
        ))}
      </AnimatePresence>
    </section>
  );
}
