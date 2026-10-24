import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { Field, Select, TextInput } from '@/shared/ui';
import { blockDescription, blockName } from '../layout/blockNames';
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
  /** Controlled selection (the editor selects a block when it is clicked). */
  selected?: string | null;
  onSelect?: (id: string) => void;
}

const SOURCED = new Set(['value', 'series', 'indicators', 'live-table', 'ranking', 'matrix', 'near-limit']);
const RANGES = ['24h', '7d', '30d'] as const;

/** FE-11 block options: what a block shows (monitor or group), the FE-58 history window and text. */
export function BlockSettings({ blocks, value, onChange, monitors, groups, editable, selected: controlled, onSelect }: BlockSettingsProps) {
  const { t } = useTranslation();
  const [own, setOwn] = useState(blocks[0]?.id ?? '');
  const selected = controlled ?? own;
  const select = (id: string) => (onSelect ? onSelect(id) : setOwn(id));
  const block = blocks.find((b) => b.id === selected);
  const options: BlockOptions = block ? { source: block.source, range: block.range, text: block.text, ...value[block.id] } : {};
  const set = (patch: BlockOptions) => block && onChange({ ...value, [block.id]: { ...options, ...patch } });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('settingsHub.layouts.block')} hint={block ? blockDescription(t, block) : undefined}>
          <Select placeholder={t('settingsHub.layouts.blockPlaceholder')} value={block ? selected : ''} onChange={(e) => select(e.target.value)}>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {blockName(t, b, blocks)}
              </option>
            ))}
          </Select>
        </Field>
        {block && SOURCED.has(block.kind) && (
          <Field label={t('layout.settings.blockSource')}>
            <Select disabled={!editable} value={options.source ?? ''} onChange={(e) => set({ source: e.target.value || undefined })}>
              <option value="">{t('layout.settings.blockSourceAll')}</option>
              {groups.length > 0 && (
                <optgroup label={t('settingsHub.layouts.groups')}>
                  {groups.map((g) => (
                    <option key={`g-${g.id}`} value={g.id}>
                      {safeText(g.name)}
                    </option>
                  ))}
                </optgroup>
              )}
              {monitors.length > 0 && (
                <optgroup label={t('settingsHub.layouts.monitors')}>
                  {monitors.map((m) => (
                    <option key={`m-${m.id}`} value={m.id}>
                      {safeText(m.name)}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>
        )}
        {block?.kind === 'series' && (
          <Field label={t('layout.settings.blockRange')}>
            <Select disabled={!editable} value={options.range ?? ''} onChange={(e) => set({ range: RANGES.find((r) => r === e.target.value) })}>
              <option value="">{t('layout.settings.blockRangeLive')}</option>
              {RANGES.map((range) => (
                <option key={range} value={range}>
                  {t(`historyRange.presets.${range}`)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {block?.kind === 'text' && (
          <Field label={t('layout.settings.blockText')} className="sm:col-span-2">
            <TextInput maxLength={280} disabled={!editable} value={options.text ?? ''} onChange={(e) => set({ text: e.target.value })} />
          </Field>
        )}
      </div>
    </div>
  );
}
