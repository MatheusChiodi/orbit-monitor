import { useEffect, useState, type KeyboardEvent } from 'react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { translate, type Message } from '@/shared/i18n/message';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { motionPreset } from '@/shared/motion/presets';
import { safeText } from '@/shared/privacy/redact';
import { Button, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';
import { GRID_COLUMNS, resizeBlock, type LayoutBlock } from '../layout/grid';
import { createHistory, type History } from '../layout/history';
import { initialDragState, keyboardDrag, type DragState } from '../layout/keyboardDrag';
import type { WallLayout } from '../layout/layoutsApi';
import { LAYOUT_TEMPLATES, templateById } from '../layout/templates';

export interface LayoutEditorProps {
  layout: WallLayout;
  onSave: (layout: WallLayout) => Promise<void> | void;
  /** False for view-only clients: the grid is read-only. */
  editable: boolean;
}

/** Row height in rem; the grid itself is 12 columns (FE-11). */
const ROW_REM = 3;

/**
 * FE-11 / FE-12 / FE-15 / FE-16: 12-column wall layout editor with keyboard drag and drop
 * (Space grab/drop, arrows move, Shift+arrows resize, Esc cancel), bounded undo/redo and templates.
 */
export function LayoutEditor({ layout, onSave, editable }: LayoutEditorProps) {
  const { t } = useTranslation();
  const level = useAnimationLevel();
  const drag = motionPreset(level, 'drag');
  const reorder = motionPreset(level, 'reorder');
  const [history, setHistory] = useState<History<LayoutBlock[]>>(() => createHistory(layout.blocks));
  const [dragState, setDragState] = useState<DragState>(() => initialDragState(layout.blocks));
  const [announcement, setAnnouncement] = useState<Message | null>(null);
  const blocks = dragState.grabbed ? dragState.layout : history.present;

  function commit(next: LayoutBlock[]) {
    setHistory((h) => h.push(next));
    setDragState(initialDragState(next));
  }

  useEffect(() => {
    if (!editable) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || dragState.grabbed) return;
      event.preventDefault();
      setHistory((h) => {
        const next = event.shiftKey ? h.redo() : h.undo();
        setDragState(initialDragState(next.present));
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editable, dragState.grabbed]);

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

  const rows = Math.max(1, ...blocks.map((b) => b.y + b.h));

  return (
    <div className="flex flex-col gap-[0.8rem]">
      <div className="flex flex-wrap items-end gap-[0.6rem]">
        {editable && (
          <span className={LABEL_CLASS}>
            <label htmlFor="layout-template">{t('layout.template')}</label>
            <select id="layout-template" className={SELECT_CLASS} value="" onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">{t('layout.template')}</option>
              {LAYOUT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {t(template.nameKey)}
                </option>
              ))}
            </select>
          </span>
        )}
        <Button onClick={() => commitHistory(history.undo())} disabled={!editable || !history.canUndo}>
          {t('layout.undo')}
        </Button>
        <Button onClick={() => commitHistory(history.redo())} disabled={!editable || !history.canRedo}>
          {t('layout.redo')}
        </Button>
        {editable && (
          <Button variant="primary" onClick={() => void onSave({ ...layout, blocks: history.present })}>
            {t('layout.save')}
          </Button>
        )}
      </div>

      <div
        role="application"
        aria-label={t('layout.editor')}
        aria-readonly={editable ? undefined : 'true'}
        data-columns={GRID_COLUMNS}
        className="grid gap-[0.4rem] rounded-[0.9rem] border border-line bg-s1 p-[0.6rem]"
        style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, ${ROW_REM}rem)` }}
      >
        {blocks.map((block) => {
          const grabbed = dragState.grabbed === block.id;
          const name = safeText(block.id);
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
                aria-pressed={grabbed}
                data-x={block.x}
                data-y={block.y}
                data-kind={block.kind}
                onKeyDown={(e) => onBlockKey(e, block)}
                className={`h-full w-full rounded-[0.6rem] border p-[0.5rem] text-left text-[0.8rem] ${grabbed ? 'border-info bg-info/12' : 'border-line-2 bg-s2'}`}
              >
                <span className="font-mono">{name}</span>
              </button>
              <button
                type="button"
                aria-label={t('layout.resize', { name })}
                disabled={!editable}
                onClick={() => resize(block)}
                className="absolute right-[0.2rem] bottom-[0.2rem] size-[0.9rem] cursor-se-resize rounded-[0.2rem] border border-line-2 bg-s3"
              />
            </m.div>
          );
        })}
      </div>

      <p role="status" aria-live="assertive" className="sr-only">
        {announcement ? translate(t, announcement) : ''}
      </p>
    </div>
  );

  function commitHistory(next: History<LayoutBlock[]>) {
    setHistory(next);
    setDragState(initialDragState(next.present));
  }
}
