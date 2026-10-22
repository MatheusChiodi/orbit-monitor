import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';
import type { LayoutBlock } from '../layout/grid';

export type BlockOptions = Pick<LayoutBlock, 'source' | 'range' | 'text'>;

export interface BlockSettingsProps {
  blocks: readonly LayoutBlock[];
  /** Options per block id, merged into the blocks when the layout is saved. */
  value: Readonly<Record<string, BlockOptions>>;
  onChange: (value: Record<string, BlockOptions>) => void;
  monitors: readonly Pick<MonitorView, 'id' | 'name'>[];
  groups: readonly Group[];
  editable: boolean;
}

const SOURCED = new Set(['value', 'series', 'indicators', 'live-table', 'ranking', 'matrix', 'near-limit']);
const RANGES = ['24h', '7d', '30d'] as const;

/** FE-11 block options: what a block shows (monitor or group), the FE-58 history window and text. */
export function BlockSettings({ blocks, value, onChange, monitors, groups, editable }: BlockSettingsProps) {
  const { t } = useTranslation();
  const id = useId();
  const [selected, setSelected] = useState(blocks[0]?.id ?? '');
  const block = blocks.find((b) => b.id === selected);
  if (!block) return null;
  const options: BlockOptions = { source: block.source, range: block.range, text: block.text, ...value[block.id] };
  const set = (patch: BlockOptions) => onChange({ ...value, [block.id]: { ...options, ...patch } });

  return (
    <div className="flex flex-wrap items-end gap-[0.8rem]">
      <span className={LABEL_CLASS}>
        <label htmlFor={`${id}-block`}>{t('layout.settings.block')}</label>
        <select id={`${id}-block`} className={SELECT_CLASS} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {safeText(b.id)}
            </option>
          ))}
        </select>
      </span>
      {SOURCED.has(block.kind) && (
        <span className={LABEL_CLASS}>
          <label htmlFor={`${id}-source`}>{t('layout.settings.blockSource')}</label>
          <select id={`${id}-source`} className={SELECT_CLASS} disabled={!editable} value={options.source ?? ''} onChange={(e) => set({ source: e.target.value || undefined })}>
            <option value="">{t('layout.settings.blockSourceAll')}</option>
            {groups.map((g) => (
              <option key={`g-${g.id}`} value={g.id}>
                {safeText(g.name)}
              </option>
            ))}
            {monitors.map((m) => (
              <option key={`m-${m.id}`} value={m.id}>
                {safeText(m.name)}
              </option>
            ))}
          </select>
        </span>
      )}
      {block.kind === 'series' && (
        <span className={LABEL_CLASS}>
          <label htmlFor={`${id}-range`}>{t('layout.settings.blockRange')}</label>
          <select
            id={`${id}-range`}
            className={SELECT_CLASS}
            disabled={!editable}
            value={options.range ?? ''}
            onChange={(e) => set({ range: RANGES.find((r) => r === e.target.value) })}
          >
            <option value="">{t('layout.settings.blockRangeLive')}</option>
            {RANGES.map((range) => (
              <option key={range} value={range}>
                {t(`historyRange.presets.${range}`)}
              </option>
            ))}
          </select>
        </span>
      )}
      {block.kind === 'text' && (
        <span className={`${LABEL_CLASS} min-w-[16rem] flex-1`}>
          <label htmlFor={`${id}-text`}>{t('layout.settings.blockText')}</label>
          <input id={`${id}-text`} className={INPUT_CLASS} maxLength={280} disabled={!editable} value={options.text ?? ''} onChange={(e) => set({ text: e.target.value })} />
        </span>
      )}
    </div>
  );
}
