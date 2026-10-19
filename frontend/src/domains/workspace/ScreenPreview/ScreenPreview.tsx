import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SCREEN_PRESETS, previewScale, rootFontSize, type ScreenPreset } from '../layout/previews';

export interface ScreenPreviewProps {
  initialPreset?: ScreenPreset['id'];
  children: ReactNode;
}

const FALLBACK_BOX = { width: 960, height: 600 };

/** FE-18: renders the wall at the real resolution of a TV frame, scaled down with a transform. */
export function ScreenPreview({ initialPreset = '1080p', children }: ScreenPreviewProps) {
  const { t } = useTranslation();
  const name = useId();
  const box = useRef<HTMLDivElement>(null);
  const [presetId, setPresetId] = useState<ScreenPreset['id']>(initialPreset);
  const [available, setAvailable] = useState(FALLBACK_BOX);
  const preset = SCREEN_PRESETS.find((p) => p.id === presetId) ?? SCREEN_PRESETS[0]!;

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height || FALLBACK_BOX.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = previewScale(preset, available);

  return (
    <div className="flex flex-col gap-[0.6rem]">
      <div role="radiogroup" aria-label={t('layout.preview.label')} className="flex flex-wrap gap-[0.4rem]">
        {SCREEN_PRESETS.map((p) => (
          <label key={p.id} className="inline-flex items-center gap-[0.3rem] text-[0.85rem]">
            <input type="radio" name={name} checked={p.id === presetId} onChange={() => setPresetId(p.id)} />
            {t(`layout.preview.presets.${p.id}`)}
          </label>
        ))}
      </div>
      <div ref={box} className="relative h-[60vh] overflow-hidden rounded-[0.6rem] border border-line bg-bg">
        <div
          data-testid="screen-frame"
          data-preset={preset.id}
          style={{
            width: `${preset.width}px`,
            height: `${preset.height}px`,
            fontSize: `${rootFontSize(preset.width, preset.height)}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
