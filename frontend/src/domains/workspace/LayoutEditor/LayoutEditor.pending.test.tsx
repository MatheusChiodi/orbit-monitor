import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import type { WallLayout } from '../layout/layoutsApi';
import { LayoutEditor } from './LayoutEditor';

const layout: WallLayout = {
  id: 'lay_noc',
  slug: 'noc',
  name: 'NOC',
  blocks: [
    { id: 'hero', kind: 'hero', x: 0, y: 0, w: 7, h: 4 },
    { id: 'timeline', kind: 'timeline', x: 7, y: 0, w: 5, h: 4 },
  ],
};

function setup(overrides: Partial<Parameters<typeof LayoutEditor>[0]> = {}) {
  const props = { layout, onSave: vi.fn().mockResolvedValue(undefined), editable: true, ...overrides };
  render(<LayoutEditor {...props} />);
  return props;
}

describe('FE-11 wall layout editor', () => {
  it('renders a 12-column grid with one focusable block per item', () => {
    setup();
    const grid = screen.getByRole('application', { name: 'Wall layout editor' });
    expect(grid).toHaveAttribute('data-columns', '12');
    expect(within(grid).getAllByRole('button', { name: /block/i })).toHaveLength(2);
  });

  it('every block has resize handles', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /Resize/ }).length).toBeGreaterThanOrEqual(2);
  });

  it('saves the edited layout through the API callback', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Save layout' }));
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'lay_noc', blocks: layout.blocks }));
  });

  it('view-only: the grid is read-only and save is hidden', () => {
    setup({ editable: false });
    expect(screen.queryByRole('button', { name: 'Save layout' })).toBeNull();
    expect(screen.getByRole('application', { name: 'Wall layout editor' })).toHaveAttribute('aria-readonly', 'true');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<LayoutEditor layout={layout} onSave={vi.fn()} editable />, 'pt-BR');
    expect(screen.getByRole('application', { name: 'Editor de layout da parede' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar layout' })).toBeInTheDocument();
  });
});

describe('FE-12 keyboard drag and drop in the editor', () => {
  it('Space grabs, arrows move, Space drops, with aria-live announcements', async () => {
    setup();
    const hero = screen.getByRole('button', { name: 'hero block' });
    hero.focus();
    await userEvent.keyboard(' ');
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'assertive');
    expect(live).toHaveTextContent('Grabbed hero at column 1, row 1');
    await userEvent.keyboard('{ArrowDown}');
    expect(live).toHaveTextContent('hero moved to column 1, row 2');
    await userEvent.keyboard(' ');
    expect(live).toHaveTextContent('hero dropped');
    expect(hero).toHaveAttribute('data-y', '1');
  });

  it('Esc cancels the move', async () => {
    setup();
    const hero = screen.getByRole('button', { name: 'hero block' });
    hero.focus();
    await userEvent.keyboard(' {ArrowDown}{Escape}');
    expect(hero).toHaveAttribute('data-y', '0');
    expect(screen.getByRole('status')).toHaveTextContent('Move cancelled');
  });

  it('announcements in pt-BR', async () => {
    renderWithLocale(<LayoutEditor layout={layout} onSave={vi.fn()} editable />, 'pt-BR');
    screen.getByRole('button', { name: 'bloco hero' }).focus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('status')).toHaveTextContent('hero pego na coluna 1, linha 1');
  });

  it('the grabbed block is marked with aria-pressed', async () => {
    setup();
    const hero = screen.getByRole('button', { name: 'hero block' });
    hero.focus();
    await userEvent.keyboard(' ');
    expect(hero).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('FE-15 undo/redo in the editor', () => {
  it('Ctrl+Z undoes and Ctrl+Shift+Z redoes a move', async () => {
    setup();
    const hero = screen.getByRole('button', { name: 'hero block' });
    hero.focus();
    await userEvent.keyboard(' {ArrowDown} ');
    expect(hero).toHaveAttribute('data-y', '1');
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(hero).toHaveAttribute('data-y', '0');
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(hero).toHaveAttribute('data-y', '1');
  });

  it('undo and redo buttons reflect availability', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });
});

describe('FE-16 templates in the editor', () => {
  it('applying a template replaces the blocks (undoable)', async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Template' }), 'single-incident');
    expect(screen.getAllByRole('button', { name: /block/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });

  it('template names are translated', () => {
    renderWithLocale(<LayoutEditor layout={layout} onSave={vi.fn()} editable />, 'pt-BR');
    expect(screen.getByRole('option', { name: 'Incidente único' })).toBeInTheDocument();
  });
});
