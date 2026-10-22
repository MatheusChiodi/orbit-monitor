import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { createCustomizeModeStore } from '@/shared/customization/customizeMode';
import { createCustomizationStore } from '@/shared/customization/store';
import { Button } from '@/shared/ui';

const idle = createCustomizeModeStore(createCustomizationStore({ storage: false }));

/** FE-53 header toggle (`Ctrl+.` / `⌘.`); absent for view-only clients, which get no mode store. */
export function CustomizeToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const { mode } = useCustomization();
  const enabled = useStore(mode ?? idle, (s) => s.enabled);

  useEffect(() => {
    if (!mode) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key === '.') {
        event.preventDefault();
        mode.getState().toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  if (!mode) return null;
  return (
    <Button variant={enabled ? 'primary' : 'ghost'} aria-pressed={enabled} aria-keyshortcuts="Control+." className={className} onClick={() => mode.getState().toggle()}>
      {t('customization.mode.toggle')}
    </Button>
  );
}
