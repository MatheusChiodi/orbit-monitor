import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { createCustomizeModeStore } from '@/shared/customization/customizeMode';
import { createCustomizationStore } from '@/shared/customization/store';
import { Button, Switch } from '@/shared/ui';

const idle = createCustomizeModeStore(createCustomizationStore({ storage: false }));

export interface CustomizeToggleProps {
  /** `button` for toolbars (wall), `switch` for Settings › Advanced. */
  variant?: 'button' | 'switch';
  /** Switch only: the explanation under the label. */
  description?: string;
  className?: string;
}

/** FE-53 toggle; the `Ctrl+.` shortcut lives in CustomizeLayer. Absent for view-only clients (no mode store). */
export function CustomizeToggle({ variant = 'button', description, className = '' }: CustomizeToggleProps) {
  const { t } = useTranslation();
  const { mode } = useCustomization();
  const enabled = useStore(mode ?? idle, (s) => s.enabled);
  if (!mode) return null;
  if (variant === 'switch') {
    return (
      <Switch label={t('settingsHub.advanced.customizeLabel')} description={description} checked={enabled} onCheckedChange={(on) => mode.getState().toggle(on)} className={className} />
    );
  }
  return (
    <Button variant={enabled ? 'primary' : 'ghost'} aria-pressed={enabled} aria-keyshortcuts="Control+." className={className} onClick={() => mode.getState().toggle()}>
      {t('customization.mode.toggle')}
    </Button>
  );
}
