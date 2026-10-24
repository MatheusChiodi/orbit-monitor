import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { VariablesCard } from './VariablesCard';
import { createDemoVariablesApi, type VariablesApi } from './variablesApi';

function setup(api: VariablesApi = createDemoVariablesApi(), editable = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <VariablesCard api={api} demo editable={editable} />
      <ToastViewport />
    </QueryClientProvider>,
  );
  return api;
}

afterEach(() => dismissAllToasts());

describe('Settings › Advanced › Variables', () => {
  it('lists the variables and explains how to use them', async () => {
    setup();
    expect(await screen.findByRole('table', { name: 'Variables' })).toBeInTheDocument();
    expect(screen.getByText('region')).toBeInTheDocument();
    expect(screen.getByText(/\$\{var:region\}/)).toBeInTheDocument();
  });

  it('adds a secret; the value is never shown back', async () => {
    const api = setup();
    const save = vi.spyOn(api, 'save');
    await userEvent.click(await screen.findByRole('button', { name: 'Add variable' }));
    const dialog = screen.getByRole('dialog', { name: 'Add variable' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Name/ }), 'apiToken');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Secret' }));
    await userEvent.type(within(dialog).getByLabelText(/Secret value/), 's3cr3t');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save variable' }));
    expect(save).toHaveBeenCalledWith(null, { name: 'apiToken', kind: 'vault', value: 's3cr3t', description: '' });
    expect(await screen.findByText('Variable apiToken saved')).toBeInTheDocument();
    expect(screen.queryByText('s3cr3t')).toBeNull();
  });

  it('rejects an invalid name', async () => {
    const api = setup();
    const save = vi.spyOn(api, 'save');
    await userEvent.click(await screen.findByRole('button', { name: 'Add variable' }));
    const dialog = screen.getByRole('dialog', { name: 'Add variable' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Name/ }), '9lives');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save variable' }));
    expect(within(dialog).getByText('Use letters, digits, _ . or -, starting with a letter or _')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it('deletes after confirming', async () => {
    const api = setup();
    const remove = vi.spyOn(api, 'remove');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for region' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete region?' })).getByRole('button', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledWith('var_region');
  });

  it('view-only clients cannot add or change variables', async () => {
    setup(createDemoVariablesApi(), false);
    await screen.findByRole('table', { name: 'Variables' });
    expect(screen.queryByRole('button', { name: 'Add variable' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Actions for region' })).toBeNull();
  });
});
