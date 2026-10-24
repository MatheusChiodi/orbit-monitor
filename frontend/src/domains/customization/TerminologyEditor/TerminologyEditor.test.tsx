import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CustomizationApi } from '@/shared/customization/api';
import { createTerminologyStore } from '@/shared/customization/terminology';
import { TerminologyEditor } from './TerminologyEditor';

function store(saveTerminology = vi.fn(async () => undefined)) {
  const api = { loadTerminology: vi.fn(async () => ({ en: { 'status.label.DOWN': 'Offline' }, 'pt-BR': {} })), saveTerminology } as unknown as CustomizationApi;
  const s = createTerminologyStore(api);
  return { s, saveTerminology, ready: s.getState().load() };
}

describe('FE-54 terminology editor', () => {
  it('searches labels by key, original or renamed text and shows the original next to the input', async () => {
    const user = userEvent.setup();
    const { s, ready } = store();
    await ready;
    render(<TerminologyEditor store={s} editable />);
    await user.type(screen.getByRole('searchbox', { name: 'Search labels' }), 'status.label.DOWN');
    const row = screen.getByRole('row', { name: /status\.label\.DOWN/ });
    expect(within(row).getByRole('textbox')).toHaveValue('Offline');
    expect(within(row).getByText('DOWN')).toBeInTheDocument();
  });

  it('renames a label, saves the language and resets it', async () => {
    const user = userEvent.setup();
    const { s, saveTerminology, ready } = store();
    await ready;
    render(<TerminologyEditor store={s} editable />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pt-BR');
    await user.type(screen.getByRole('searchbox', { name: 'Search labels' }), 'console.monitors.title');
    const input = within(screen.getByRole('row', { name: /console\.monitors\.title/ })).getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Verificações');
    await user.click(screen.getByRole('button', { name: 'Save names' }));
    expect(saveTerminology).toHaveBeenCalledWith('pt-BR', { 'console.monitors.title': 'Verificações' });
    expect(await screen.findByText('Names saved')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset console.monitors.title' }));
    await user.click(screen.getByRole('button', { name: 'Save names' }));
    expect(saveTerminology).toHaveBeenLastCalledWith('pt-BR', {});
  });

  it('refuses an empty label so a state never loses its text', async () => {
    const user = userEvent.setup();
    const { s, saveTerminology, ready } = store();
    await ready;
    render(<TerminologyEditor store={s} editable />);
    await user.type(screen.getByRole('searchbox', { name: 'Search labels' }), 'status.label.DOWN');
    await user.clear(within(screen.getByRole('row', { name: /status\.label\.DOWN/ })).getByRole('textbox'));
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be empty');
    expect(screen.getByRole('button', { name: 'Save names' })).toBeDisabled();
    expect(saveTerminology).not.toHaveBeenCalled();
  });

  it('filters to renamed labels and restores a whole language after confirming (DELETE /api/terminology/{locale})', async () => {
    const user = userEvent.setup();
    const resetTerminology = vi.fn(async () => undefined);
    const api = { loadTerminology: vi.fn(async () => ({ en: { 'status.label.DOWN': 'Offline' }, 'pt-BR': {} })), saveTerminology: vi.fn(), resetTerminology } as unknown as CustomizationApi;
    const s = createTerminologyStore(api);
    await s.getState().load();
    render(<TerminologyEditor store={s} editable />);
    await user.click(screen.getByRole('checkbox', { name: 'Renamed only' }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Restore original names in English' }));
    const dialog = screen.getByRole('dialog', { name: 'Restore the original names in English?' });
    await user.click(within(dialog).getByRole('button', { name: 'Restore original names' }));
    expect(resetTerminology).toHaveBeenCalledWith('en');
    expect(s.getState().labels.en).toEqual({});
    expect(screen.getByText('Original names restored in English')).toBeInTheDocument();
  });

  it('is read-only for view-only clients', async () => {
    const { s, ready } = store();
    await ready;
    render(<TerminologyEditor store={s} editable={false} />);
    expect(screen.queryByRole('button', { name: 'Save names' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('readonly');
  });
});
