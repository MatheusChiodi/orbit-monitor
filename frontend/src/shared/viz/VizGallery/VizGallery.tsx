import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DISPLAY_MODES, type DisplayModeId } from '../compatibility';
import { MODE_COMPONENTS } from '../modes';
import { VisualizationPicker } from '../VisualizationPicker/VisualizationPicker';
import { DEMO, PICKER_DEMO } from './demoData';

export interface VizGalleryProps {
  section: 'modes' | 'picker';
}

/** Dev-only gallery (`src/shared/viz/VizGallery/gallery.html`): all 20 modes and the picker on demo data. Not in any build input. */
export function VizGallery({ section }: VizGalleryProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<DisplayModeId>('headroom-bar');
  if (section === 'picker') {
    return (
      <main className="min-h-screen bg-bg p-[1.2rem]">
        <VisualizationPicker field={{ field: 'PENDING_QTY', label: 'Pending' }} data={PICKER_DEMO} selected={selected} onSelect={setSelected} />
      </main>
    );
  }
  return (
    <main className="grid min-h-screen content-start grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] items-start gap-[0.8rem] bg-bg p-[1.2rem]">
      {DISPLAY_MODES.map((mode, i) => {
        const Mode = MODE_COMPONENTS[mode];
        return (
          <section key={mode} className="flex flex-col gap-[0.35rem]">
            <h2 className="m-0 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">{`${i + 1} · ${t(`viz.modes.${mode}`)}`}</h2>
            <Mode data={DEMO[mode]} />
          </section>
        );
      })}
    </main>
  );
}
