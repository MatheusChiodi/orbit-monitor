import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOperatorStore } from '@/domains/security/operator';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

function offlineApi(): ConsoleApi {
  return {
    getAccess: vi.fn().mockRejectedValue(new Error('offline')),
    listGroups: vi.fn().mockRejectedValue(new Error('offline')),
    listMonitors: vi.fn().mockRejectedValue(new Error('offline')),
    listConnections: vi.fn().mockRejectedValue(new Error('offline')),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
  };
}

function onlineApi(mode: 'edit' | 'view-only'): ConsoleApi {
  return {
    ...offlineApi(),
    getAccess: vi.fn().mockResolvedValue({ mode, client: mode === 'edit' ? 'loopback' : 'lan' }),
    listGroups: vi.fn().mockResolvedValue([{ id: 'g', name: 'Portal' }]),
    listMonitors: vi.fn().mockResolvedValue([
      { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: new Date().toISOString() },
    ]),
    listConnections: vi.fn().mockResolvedValue([]),
  };
}

function namedStore(name = 'M. Chiodi') {
  const store = createOperatorStore();
  store.getState().setName(name);
  return store;
}

beforeEach(() => {
  localStorage.clear();
});

describe('ConsoleApp (no login)', () => {
  it('asks once for the operator name, then opens the monitor list', async () => {
    render(<ConsoleApp api={offlineApi()} operatorStore={createOperatorStore()} />);
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    await userEvent.type(screen.getByLabelText('Operator name'), 'M. Chiodi');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Reconciliation queue')).toBeInTheDocument();
    expect(screen.getByText('M. Chiodi')).toBeInTheDocument();
  });

  it('a saved operator name skips the prompt', async () => {
    render(<ConsoleApp api={onlineApi('edit')} operatorStore={namedStore()} />);
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(screen.queryByLabelText('Operator name')).toBeNull();
  });

  it('edit mode (loopback) shows edit actions', async () => {
    render(<ConsoleApp api={onlineApi('edit')} operatorStore={namedStore()} />);
    expect(await screen.findByRole('button', { name: 'New monitor' })).toBeInTheDocument();
    expect(screen.queryByText(/View-only/)).toBeNull();
  });

  it('view-only mode hides edit actions and explains why; acknowledging stays on the wall', async () => {
    render(<ConsoleApp api={onlineApi('view-only')} operatorStore={namedStore()} />);
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(screen.getByText('View-only: edits are allowed only on the machine running Orbit')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New monitor' })).toBeNull();
  });

  it('without a backend falls back to demo data, creates a monitor with preview and returns saved', async () => {
    render(<ConsoleApp api={offlineApi()} operatorStore={namedStore()} />);
    expect(await screen.findByText('Reconciliation queue')).toBeInTheDocument();
    expect(screen.getByText('demo data')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New monitor' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Late batches');
    await userEvent.selectOptions(screen.getByLabelText('Group'), 'core');
    await userEvent.selectOptions(await screen.findByLabelText('Connection'), 'ora-core');
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT COUNT(*) FROM BATCH' } });
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(await screen.findByRole('table', { name: 'Preview result' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save monitor' }));
    expect(await screen.findByText('Monitor "Late batches" saved')).toBeInTheDocument();
    expect(await screen.findByText('Late batches')).toBeInTheDocument();
  });

  it('the operator can change the name', async () => {
    const store = namedStore('Ana');
    render(<ConsoleApp api={onlineApi('edit')} operatorStore={store} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Change name' }));
    const input = screen.getByLabelText('Operator name');
    expect(input).toHaveValue('Ana');
    await userEvent.clear(input);
    await userEvent.type(input, 'R. Lima');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(store.getState().name).toBe('R. Lima');
    expect(await screen.findByText('R. Lima')).toBeInTheDocument();
  });

  it('has a language selector and a link to the wall', async () => {
    render(<ConsoleApp api={onlineApi('edit')} operatorStore={namedStore()} />);
    expect(await screen.findByRole('combobox', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open wall' })).toHaveAttribute('href', '/wall.html');
  });

  it('renders in pt-BR', async () => {
    renderWithLocale(<ConsoleApp api={onlineApi('view-only')} operatorStore={namedStore()} />, 'pt-BR');
    expect(await screen.findByRole('heading', { name: 'Monitores' })).toBeInTheDocument();
    expect(screen.getByText('Somente leitura: edições só na máquina onde o Orbit roda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir parede' })).toBeInTheDocument();
  });
});

describe('FE-28 / FE-29 in the console', () => {
  it('Ctrl+K opens the palette and choosing a monitor action opens the form', async () => {
    render(<ConsoleApp api={onlineApi('edit')} operatorStore={namedStore()} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('New monitor{Enter}');
    expect(await screen.findByRole('heading', { name: 'New monitor' })).toBeInTheDocument();
  });

  it('the palette lists the monitors', async () => {
    render(<ConsoleApp api={onlineApi('edit')} operatorStore={namedStore()} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('option', { name: /Web portal/ })).toBeInTheDocument();
  });

  it('"N" opens a new monitor (edit mode only)', async () => {
    render(<ConsoleApp api={onlineApi('edit')} operatorStore={namedStore()} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('n');
    expect(await screen.findByRole('heading', { name: 'New monitor' })).toBeInTheDocument();
  });

  it('"N" does nothing in view-only mode', async () => {
    render(<ConsoleApp api={onlineApi('view-only')} operatorStore={namedStore()} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('n');
    expect(screen.queryByRole('heading', { name: 'New monitor' })).toBeNull();
  });
});
