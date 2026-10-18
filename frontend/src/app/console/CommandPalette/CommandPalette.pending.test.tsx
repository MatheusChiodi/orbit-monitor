import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { CommandPalette } from './CommandPalette';
import { searchPalette, type PaletteItem } from './palette';

const items: PaletteItem[] = [
  { id: 'm-reconciliation', kind: 'monitor', label: 'Reconciliation queue', hint: 'Payments' },
  { id: 'm-checkout', kind: 'monitor', label: 'Checkout API', hint: 'Payments' },
  { id: 'g-core', kind: 'group', label: 'Core Banking' },
  { id: 'l-noc', kind: 'layout', label: 'NOC' },
  { id: 'a-new-monitor', kind: 'action', label: 'New monitor', requiresEdit: true },
  { id: 'a-open-wall', kind: 'action', label: 'Open wall' },
];

function setup(mode: 'edit' | 'view-only' = 'edit') {
  const onSelect = vi.fn();
  render(
    <>
      <button type="button">outside</button>
      <CommandPalette items={items} mode={mode} onSelect={onSelect} />
    </>,
  );
  return { onSelect };
}

describe('FE-28 command palette', () => {
  describe('searchPalette (pure)', () => {
    it('matches monitors, groups, layouts and actions, ignoring case and accents', () => {
      expect(searchPalette(items, 'recon').map((i) => i.id)).toEqual(['m-reconciliation']);
      expect(searchPalette(items, 'CORE').map((i) => i.id)).toEqual(['g-core']);
      expect(searchPalette([{ id: 'x', kind: 'group', label: 'Integrações' }], 'integracoes')).toHaveLength(1);
    });

    it('ranks prefix matches before substring matches', () => {
      const ranked = searchPalette(items, 'c').map((i) => i.id);
      expect(ranked.indexOf('m-checkout')).toBeLessThan(ranked.indexOf('m-reconciliation'));
    });

    it('an empty query returns everything', () => {
      expect(searchPalette(items, '  ')).toHaveLength(items.length);
    });
  });

  it('Ctrl+K opens a labelled dialog with focus in the search box', async () => {
    setup();
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search monitors, groups, layouts and actions' })).toHaveFocus();
  });

  it('Meta+K (macOS) also opens it', async () => {
    setup();
    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('typing filters the options and groups them by kind', async () => {
    setup();
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('pay');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Reconciliation queuePayments', 'Checkout APIPayments']);
    expect(screen.getByRole('group', { name: 'Monitors' })).toBeInTheDocument();
  });

  it('arrow keys move the active option and Enter selects it', async () => {
    const { onSelect } = setup();
    await userEvent.keyboard('{Control>}k{/Control}');
    const combobox = screen.getByRole('combobox');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const active = screen.getAllByRole('option')[1]!;
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(combobox).toHaveAttribute('aria-activedescendant', active.id);
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: items[1]!.id }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape closes and returns focus to where it was', async () => {
    setup();
    const outside = screen.getByRole('button', { name: 'outside' });
    outside.focus();
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(outside).toHaveFocus();
  });

  it('shows a friendly message when nothing matches', async () => {
    setup();
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('zzzz');
    expect(screen.getByText('No results for "zzzz"')).toBeInTheDocument();
  });

  it('view-only mode hides edit actions', async () => {
    setup('view-only');
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('option', { name: /New monitor/ })).toBeNull();
    expect(screen.getByRole('option', { name: /Open wall/ })).toBeInTheDocument();
  });

  it('respects reduced motion (no transition attribute)', async () => {
    render(<CommandPalette items={items} mode="edit" onSelect={vi.fn()} animationLevel="off" defaultOpen />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-animation', 'off');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<CommandPalette items={items} mode="edit" onSelect={vi.fn()} defaultOpen />, 'pt-BR');
    expect(screen.getByRole('dialog', { name: 'Paleta de comandos' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Buscar monitores, grupos, layouts e ações' })).toBeInTheDocument();
  });
});
