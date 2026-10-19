import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SavedViews } from './SavedViews';
import { SAVED_VIEWS_KEY, applyView, loadViews, sanitizeView, saveViews, type SavedView } from './viewFilters';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));
const problems: SavedView = { id: 'v1', name: 'Problems', filter: { states: ['DOWN', 'WARN'], groupIds: [], tags: [], query: '' } };

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('FE-30 saved views', () => {
  describe('applyView (pure)', () => {
    it('filters by state', () => {
      expect(applyView(snap.monitors, problems).map((m) => m.id).sort()).toEqual(['acquirer', 'reconciliation', 'tablespace']);
    });
    it('filters by group and text query', () => {
      const view: SavedView = { id: 'v', name: 'Core', filter: { states: [], groupIds: ['core'], tags: [], query: 'lag' } };
      expect(applyView(snap.monitors, view).map((m) => m.id)).toEqual(['replica']);
    });
    it('an empty filter keeps everything', () => {
      const all: SavedView = { id: 'a', name: 'All', filter: { states: [], groupIds: [], tags: [], query: '' } };
      expect(applyView(snap.monitors, all)).toHaveLength(snap.monitors.length);
    });
  });

  describe('device-only storage and privacy', () => {
    it('saves only filter fields, never probe data', () => {
      const dirty = { ...problems, monitors: snap.monitors, rows: [{ PAN: '4111 1111 1111 1111' }] } as unknown as SavedView;
      saveViews([dirty]);
      const raw = localStorage.getItem(SAVED_VIEWS_KEY) ?? '';
      expect(raw).not.toContain('4111');
      expect(raw).not.toContain('Reconciliation queue');
      expect(JSON.parse(raw)).toEqual([sanitizeView(problems)]);
    });

    it('loads saved views and ignores corrupt data', () => {
      saveViews([problems]);
      expect(loadViews()).toEqual([problems]);
      localStorage.setItem(SAVED_VIEWS_KEY, '{oops');
      expect(loadViews()).toEqual([]);
    });

    it('survives blocked storage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(loadViews()).toEqual([]);
    });
  });

  it('saves the current filter as a named view and applies it', async () => {
    const onApply = vi.fn();
    render(<SavedViews current={problems.filter} onApply={onApply} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'View name' }), 'Problems');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Problems' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ name: 'Problems', filter: problems.filter }));
  });

  it('marks the active view with aria-pressed and deletes a view with confirmation', async () => {
    saveViews([problems]);
    render(<SavedViews current={problems.filter} activeId="v1" onApply={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Problems' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Delete view Problems' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(loadViews()).toEqual([]);
  });

  it('empty state explains views are kept on this device', () => {
    render(<SavedViews current={problems.filter} onApply={vi.fn()} />);
    expect(screen.getByText('No saved views yet. Views are kept on this device only.')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<SavedViews current={problems.filter} onApply={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Salvar visão' })).toBeInTheDocument();
  });
});
