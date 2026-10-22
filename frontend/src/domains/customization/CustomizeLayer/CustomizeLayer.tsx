import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { Button } from '@/shared/ui';
import { CustomizeInspector } from '../CustomizeInspector';

/** FE-53: Customize-mode bar (Save · Discard · Undo) and inspector; renders nothing while the mode is off. */
export function CustomizeLayer() {
  const { store, mode, terminology, layoutId } = useCustomization();
  if (!mode) return null;
  return <ModeLayer store={store} mode={mode} terminology={terminology} layoutId={layoutId} />;
}

type Context = ReturnType<typeof useCustomization>;
interface LayerProps {
  store: Context['store'];
  mode: NonNullable<Context['mode']>;
  terminology: Context['terminology'];
  layoutId: Context['layoutId'];
}

function ModeLayer({ store, mode, terminology, layoutId }: LayerProps) {
  const { t } = useTranslation();
  const enabled = useStore(mode, (s) => s.enabled);
  const changes = useStore(mode, (s) => s.changes);
  const saving = useStore(mode, (s) => s.saving);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) root.dataset.customize = 'on';
    else delete root.dataset.customize;
    return () => void delete root.dataset.customize;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && !typing) {
        event.preventDefault();
        mode.getState().undo();
      } else if (event.key === 'Escape') mode.getState().select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, mode]);

  if (!enabled) return null;
  return (
    <>
      <div role="region" aria-label={t('customization.mode.toggle')} className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-[0.8rem] border-t border-info/50 bg-s1/95 px-[1.2rem] py-[0.6rem] text-[0.85rem]">
        <span className="text-info">{t('customization.mode.on')}</span>
        <span role="status" className="text-muted">
          {changes.length > 0 && t('customization.mode.pending', { count: changes.length })}
        </span>
        <span className="ml-auto flex flex-wrap gap-[0.5rem]">
          <Button variant="ghost" disabled={changes.length === 0} aria-keyshortcuts="Control+Z" onClick={() => mode.getState().undo()}>
            {t('customization.mode.undo')}
          </Button>
          <Button disabled={changes.length === 0} onClick={() => mode.getState().discard()}>
            {t('customization.mode.discard')}
          </Button>
          <Button variant="primary" disabled={changes.length === 0 || saving} onClick={() => void mode.getState().save()}>
            {t('customization.mode.save')}
          </Button>
          <Button variant="ghost" onClick={() => mode.getState().toggle(false)}>
            {t('customization.mode.exit')}
          </Button>
        </span>
      </div>
      <CustomizeInspector store={store} mode={mode} terminology={terminology} layoutId={layoutId} />
    </>
  );
}
