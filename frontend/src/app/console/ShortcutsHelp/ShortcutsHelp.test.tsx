import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ShortcutsHelp } from './ShortcutsHelp';
import { DEFAULT_SHORTCUTS, formatShortcut, matchShortcut, useShortcuts } from './shortcuts';

function key(init: KeyboardEventInit & { target?: EventTarget }) {
  const event = new KeyboardEvent('keydown', init);
  if (init.target) Object.defineProperty(event, 'target', { value: init.target });
  return event;
}

function Harness({ onNewMonitor }: { onNewMonitor: () => void }) {
  useShortcuts({ 'monitor.new': onNewMonitor });
  return (
    <>
      <input aria-label="Filter monitors" />
      <ShortcutsHelp shortcuts={DEFAULT_SHORTCUTS} />
    </>
  );
}

describe('FE-29 keyboard shortcuts', () => {
  describe('matchShortcut (pure)', () => {
    it('matches modifiers exactly', () => {
      expect(matchShortcut(key({ key: 'k', ctrlKey: true }), 'Mod+K')).toBe(true);
      expect(matchShortcut(key({ key: 'k', metaKey: true }), 'Mod+K')).toBe(true);
      expect(matchShortcut(key({ key: 'k' }), 'Mod+K')).toBe(false);
      expect(matchShortcut(key({ key: 'z', ctrlKey: true, shiftKey: true }), 'Mod+Shift+Z')).toBe(true);
    });

    it('ignores single-key shortcuts while typing in a field', () => {
      const input = document.createElement('input');
      expect(matchShortcut(key({ key: 'n', target: input }), 'N')).toBe(false);
      expect(matchShortcut(key({ key: 'n' }), 'N')).toBe(true);
    });
  });

  it('formatShortcut shows platform-friendly labels', () => {
    expect(formatShortcut('Mod+K', 'windows')).toBe('Ctrl + K');
    expect(formatShortcut('Mod+K', 'mac')).toBe('⌘ K');
  });

  it('"?" opens the cheat sheet listing every shortcut', async () => {
    render(<Harness onNewMonitor={vi.fn()} />);
    await userEvent.keyboard('?');
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(DEFAULT_SHORTCUTS.length);
    expect(dialog).toHaveTextContent('Open command palette');
    expect(dialog).toHaveTextContent('New monitor');
  });

  it('a global shortcut runs its action, but not while typing', async () => {
    const onNewMonitor = vi.fn();
    render(<Harness onNewMonitor={onNewMonitor} />);
    await userEvent.keyboard('n');
    expect(onNewMonitor).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('textbox', { name: 'Filter monitors' }));
    await userEvent.keyboard('n');
    expect(onNewMonitor).toHaveBeenCalledTimes(1);
  });

  it('Escape closes the cheat sheet', async () => {
    render(<Harness onNewMonitor={vi.fn()} />);
    await userEvent.keyboard('?');
    await userEvent.keyboard('{Escape}');
    // The dialog leaves through AnimatePresence (FE-51), so wait for the exit to finish.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keys are announced with <kbd>', async () => {
    const { container } = render(<ShortcutsHelp shortcuts={DEFAULT_SHORTCUTS} defaultOpen />);
    expect(container.querySelectorAll('kbd').length).toBeGreaterThan(0);
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ShortcutsHelp shortcuts={DEFAULT_SHORTCUTS} defaultOpen />, 'pt-BR');
    expect(screen.getByRole('dialog', { name: 'Atalhos de teclado' })).toHaveTextContent('Abrir paleta de comandos');
  });
});
