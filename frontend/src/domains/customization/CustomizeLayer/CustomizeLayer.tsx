import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { Button } from '@/shared/ui';
import { CustomizeInspector } from '../CustomizeInspector';

const BAR_HEIGHT_VAR = '--customize-bar-height';

/**
 * FE-53: Customize-mode bar (Save · Discard · Undo) and inspector; renders nothing while the mode is off.
 * Owns the `Ctrl+.` / `⌘.` shortcut, so the mode works wherever the layer is mounted.
 */
export function CustomizeLayer() {
  const { store, mode, terminology, layoutId } = useCustomization();

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
  const enabled = useStore(mode, (s) => s.enabled);

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
      <ModeBar mode={mode} />
      <CustomizeInspector store={store} mode={mode} terminology={terminology} layoutId={layoutId} />
    </>
  );
}

/** Fixed bar; while it is shown the page gets the same bottom padding, so nothing hides behind it. */
function ModeBar({ mode }: { mode: LayerProps['mode'] }) {
  const { t } = useTranslation();
  const bar = useRef<HTMLDivElement>(null);
  const changes = useStore(mode, (s) => s.changes);
  const saving = useStore(mode, (s) => s.saving);

  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () => {
      const height = `${Math.ceil(el.getBoundingClientRect().height)}px`;
      root.style.setProperty(BAR_HEIGHT_VAR, height);
      document.body.style.paddingBottom = height;
    };
    publish();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null;
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty(BAR_HEIGHT_VAR);
      document.body.style.paddingBottom = '';
    };
  }, []);

  return (
    <div
      ref={bar}
      role="region"
      aria-label={t('customization.mode.toggle')}
      className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-accent/50 bg-s1 px-4 py-3 text-sm shadow-popover sm:px-6"
    >
      <span className="text-text">{t('customization.mode.on')}</span>
      <span role="status" className="text-muted">
        {changes.length > 0 && t('customization.mode.pending', { count: changes.length })}
      </span>
      <span className="ml-auto flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" disabled={changes.length === 0} aria-keyshortcuts="Control+Z" onClick={() => mode.getState().undo()}>
          {t('customization.mode.undo')}
        </Button>
        <Button size="sm" disabled={changes.length === 0} onClick={() => mode.getState().discard()}>
          {t('customization.mode.discard')}
        </Button>
        <Button variant="primary" size="sm" disabled={changes.length === 0} loading={saving} onClick={() => void mode.getState().save()}>
          {t('customization.mode.save')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => mode.getState().toggle(false)}>
          {t('customization.mode.exit')}
        </Button>
      </span>
    </div>
  );
}
