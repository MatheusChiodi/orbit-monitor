import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { translate, type Message } from '@/shared/i18n/message';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { motionPreset } from '@/shared/motion/presets';
import { Button, Select } from '@/shared/ui';
import { blockDescription, blockName } from '../layout/blockNames';
import { GRID_COLUMNS, resizeBlock, type LayoutBlock } from '../layout/grid';
import { createHistory, type History } from '../layout/history';
import { initialDragState, keyboardDrag, type DragState } from '../layout/keyboardDrag';
import type { WallLayout } from '../layout/layoutsApi';
import { LAYOUT_TEMPLATES, templateById } from '../layout/templates';
import { BlockPreview, type PreviewMonitor } from './BlockPreview';

export interface LayoutEditorProps {
  layout: WallLayout;
  /** When given, the editor shows its own Save button; pages with a sticky action bar use `onChange`. */
  onSave?: (layout: WallLayout) => Promise<void> | void;
  /** Every committed change of the blocks (move, resize, template, undo/redo). */
  onChange?: (blocks: LayoutBlock[]) => void;
  /** False for view-only clients: the grid is read-only. */
  editable: boolean;
  /** Monitors drawn inside the block previews. */
  monitors?: readonly PreviewMonitor[];
  /** Block highlighted for its options (BlockSettings); clicking a block selects it. */
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
}

/** Row height in rem; the grid itself is 12 columns (FE-11). */
const ROW_REM = 3;
const NO_MONITORS: readonly PreviewMonitor[] = [];

/**
 * FE-11 / FE-12 / FE-15 / FE-16: 12-column wall layout editor with human block names and live previews,
 * keyboard drag and drop (Space grab/drop, arrows move, Shift+arrows resize, Esc cancel), bounded
 * undo/redo and templates.
 */
export function LayoutEditor({ layout, onSave, onChange, editable, monitors = NO_MONITORS, selectedBlockId = null, onSelectBlock }: LayoutEditorProps) {
  const { t } = useTranslation();
  const templateId = useId();
  const level = useAnimationLevel();
  const drag = motionPreset(level, 'drag');
  const reorder = motionPreset(level, 'reorder');
  const [history, setHistory] = useState<History<LayoutBlock[]>>(() => createHistory(layout.blocks));
  const [dragState, setDragState] = useState<DragState>(() => initialDragState(layout.blocks));
  const [announcement, setAnnouncement] = useState<Message | null>(null);
  const blocks = dragState.grabbed ? dragState.layout : history.present;

  function commitHistory(next: History<LayoutBlock[]>) {
    setHistory(next);
    setDragState(initialDragState(next.present));
    onChange?.(next.present);
  }

  function commit(next: LayoutBlock[]) {
    commitHistory(history.push(next));
  }

  useEffect(() => {
    if (!editable) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || dragState.grabbed) return;
      event.preventDefault();
      commitHistory(event.shiftKey ? history.redo() : history.undo());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function onBlockKey(event: KeyboardEvent<HTMLButtonElement>, block: LayoutBlock) {
    if (!editable || ![' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const base = dragState.grabbed ? dragState : initialDragState(history.present);
    const next = keyboardDrag(base, { key: event.key, shiftKey: event.shiftKey, blockId: block.id });
    if (next.announcement) setAnnouncement(next.announcement);
    // Dropping turns the drag into one undoable change.
    if (event.key === ' ' && base.grabbed === block.id) commit(next.layout);
    else setDragState(next);
  }

  function resize(block: LayoutBlock) {
    if (!editable) return;
    commit(resizeBlock(history.present, block.id, { w: block.w + 1, h: block.h }));
  }

  function applyTemplate(id: string) {
    const template = templateById(id);
    if (template) commit(template.blocks);
  }

  // Announcements carry the block id; people hear its name.
  const spoken = (message: Message): string => {
    const id = message.params?.name;
    const block = typeof id === 'string' ? blocks.find((b) => b.id === id) : undefined;
    return translate(t, block ? { ...message, params: { ...message.params, name: blockName(t, block, blocks) } } : message);
  };

  const rows = Math.max(1, ...blocks.map((b) => b.y + b.h));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        {editable && (
          <div className="flex w-full max-w-xs flex-col gap-1.5">
            <label htmlFor={templateId} className="text-sm font-medium text-muted">
              {t('settingsHub.layouts.template')}
            </label>
            <Select id={templateId} placeholder={t('settingsHub.layouts.templatePlaceholder')} value="" onChange={(e) => applyTemplate(e.target.value)}>
              {LAYOUT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {t(`settingsHub.templates.${template.id}.name`)}
                </option>
              ))}
            </Select>
          </div>
        )}
        <Button size="md" onClick={() => commitHistory(history.undo())} disabled={!editable || !history.canUndo}>
          {t('layout.undo')}
        </Button>
        <Button size="md" onClick={() => commitHistory(history.redo())} disabled={!editable || !history.canRedo}>
          {t('layout.redo')}
        </Button>
        {editable && onSave && (
          <Button variant="primary" onClick={() => void onSave({ ...layout, blocks: history.present })}>
            {t('layout.save')}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div
          role="application"
          aria-label={t('layout.editor')}
          aria-readonly={editable ? undefined : 'true'}
          data-columns={GRID_COLUMNS}
          className="grid min-w-2xl gap-1.5 rounded-md border border-line bg-bg p-2"
          style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, ${ROW_REM}rem)` }}
        >
          {blocks.map((block) => {
            const grabbed = dragState.grabbed === block.id;
            const selected = selectedBlockId === block.id;
            const name = blockName(t, block, blocks);
            return (
              <m.div
                key={block.id}
                layout={level === 'off' ? false : 'position'}
                animate={grabbed ? drag.animate : { scale: 1 }}
                transition={{ ...drag.transition, layout: reorder.transition }}
                className="relative min-w-0"
                style={{ gridColumn: `${block.x + 1} / span ${block.w}`, gridRow: `${block.y + 1} / span ${block.h}` }}
              >
                <button
                  type="button"
                  aria-label={t('layout.block', { name })}
                  title={blockDescription(t, block)}
                  aria-pressed={grabbed}
                  aria-current={selected || undefined}
                  data-x={block.x}
                  data-y={block.y}
                  data-kind={block.kind}
                  onKeyDown={(e) => onBlockKey(e, block)}
                  onClick={() => onSelectBlock?.(block.id)}
                  className={`flex h-full w-full flex-col gap-1.5 overflow-hidden rounded-sm border p-2 text-left text-sm transition-colors duration-120 ${
                    grabbed ? 'border-accent bg-accent/10' : selected ? 'border-accent bg-s2' : 'border-line-2 bg-s1 hover:border-muted'
                  }`}
                >
                  <span className="section-label truncate">{name}</span>
                  <BlockPreview kind={block.kind} monitors={monitors} text={block.text} />
                </button>
                {editable && (
                  <button
                    type="button"
                    aria-label={t('layout.resize', { name })}
                    onClick={() => resize(block)}
                    className="absolute right-1 bottom-1 size-3.5 cursor-se-resize rounded-sm border border-line-2 bg-s3"
                  />
                )}
              </m.div>
            );
          })}
        </div>
      </div>

      <p role="status" aria-live="assertive" className="sr-only">
        {announcement ? spoken(announcement) : ''}
      </p>
    </div>
  );
}
