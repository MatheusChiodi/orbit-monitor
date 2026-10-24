import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WallLayout } from '@/domains/workspace/layout/layoutsApi';
import { ThemeProvider } from '@/shared/theme';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { LayoutsPage } from './LayoutsPage';
import { uniqueSlug } from './slug';

const noc: WallLayout = {
  id: 'lay-noc',
  slug: 'noc',
  name: 'NOC room',
  blocks: [
    { id: 'hero', kind: 'hero', x: 0, y: 0, w: 7, h: 4 },
    { id: 'matrix', kind: 'matrix', x: 7, y: 0, w: 5, h: 4 },
  ],
};

function setup(layouts: WallLayout[] = [noc], selectedId: string | null = null) {
  const api = { list: vi.fn().mockResolvedValue(layouts), save: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ThemeProvider target={document.createElement('div')} search="">
        <LayoutsPage api={api} editable selectedId={selectedId} monitors={[]} groups={[]} />
        <ToastViewport />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return api;
}

afterEach(() => {
  dismissAllToasts();
  window.location.hash = '';
});

describe('FE-72 Settings › Wall layouts', () => {
  it('opens the first layout and shows blocks by name, never by raw id', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'NOC room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Main status block' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monitor grid block' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Main status' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'hero' })).toBeNull();
  });

  it('a fresh install invites to create the first layout', async () => {
    setup([]);
    expect(await screen.findByText('No wall layout yet. Create one from a template.')).toBeInTheDocument();
  });

  it('asks for a name and a template before creating a layout', async () => {
    setup([]);
    await userEvent.click(await screen.findByRole('button', { name: 'New layout' }));
    const dialog = screen.getByRole('dialog', { name: 'New wall layout' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create layout' }));
    expect(within(dialog).getByText('Give the layout a name')).toBeInTheDocument();
    expect(within(dialog).getByText('Main status, problems, monitor grid and events: the full picture for a NOC screen.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Name/ }), 'Sala de operações');
    await userEvent.click(within(dialog).getByRole('radio', { name: /Executive summary/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create layout' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByRole('heading', { name: /Sala de operações/ })).toBeInTheDocument();
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    expect(screen.getByText('Wall address: /wall/sala-de-operacoes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Availability block' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save layout' })).toBeEnabled();
  });

  it('saves from the sticky bar only after a change', async () => {
    const api = setup();
    const save = await screen.findByRole('button', { name: 'Save layout' });
    expect(save).toBeDisabled();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Replace blocks with a template' }), 'team');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await userEvent.click(save);
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'lay-noc', blocks: expect.arrayContaining([expect.objectContaining({ kind: 'clock' })]) }));
    expect(await screen.findByText('Layout NOC room saved')).toBeInTheDocument();
  });

  it('copies the TV address from the layout menu', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'More actions for NOC room' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy TV address' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/wall/noc`);
    expect(await screen.findByText('TV address copied')).toBeInTheDocument();
  });

  it('duplicates a layout into an unsaved copy with its own address', async () => {
    const api = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'More actions for NOC room' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(await screen.findByRole('heading', { name: /NOC room \(copy\)/ })).toBeInTheDocument();
    expect(screen.getByText('Wall address: /wall/noc-room-copy')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save layout' }));
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'NOC room (copy)', slug: 'noc-room-copy', blocks: noc.blocks }));
  });

  it('deletes a layout after confirming', async () => {
    const api = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'More actions for NOC room' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete layout' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete NOC room?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete layout' }));
    expect(api.remove).toHaveBeenCalledWith('lay-noc');
    expect(await screen.findByText('Layout NOC room deleted')).toBeInTheDocument();
  });

  it('builds the wall address from the name', () => {
    expect(uniqueSlug('Sala de Operações', [])).toBe('sala-de-operacoes');
    expect(uniqueSlug('NOC', ['noc'])).toBe('noc-2');
    expect(uniqueSlug('!!!', [])).toBe('layout');
  });
});
