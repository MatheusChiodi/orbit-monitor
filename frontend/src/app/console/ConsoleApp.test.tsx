import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { dismissAllToasts } from '@/shared/ui';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

// The Settings area is tested with its own screens; the shell only hands it the section.
vi.mock('./screens/SettingsRoute', () => ({ SettingsRoute: () => null }));

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

beforeEach(() => {
  dismissAllToasts();
  localStorage.clear();
});

describe('ConsoleApp (no login)', () => {
  it('opens straight to the workspace: no password, no operator name prompt', async () => {
    const api = onlineApi('edit');
    render(<ConsoleApp api={api} />);
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByLabelText('Operator name')).toBeNull();
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(api.getAccess).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Operator name')).toBeNull();
  });

  it('a name left by an older version is neither shown nor asked for', async () => {
    localStorage.setItem('orbit.operator', 'M. Chiodi');
    render(<ConsoleApp api={onlineApi('edit')} />);
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(screen.queryByText('M. Chiodi')).toBeNull();
  });

  it('edit mode (loopback) shows edit actions', async () => {
    render(<ConsoleApp api={onlineApi('edit')} />);
    expect(await screen.findByRole('button', { name: 'New monitor' })).toBeInTheDocument();
    expect(screen.queryByText(/View-only/)).toBeNull();
  });

  it('view-only mode hides edit actions and explains why; acknowledging stays on the wall', async () => {
    render(<ConsoleApp api={onlineApi('view-only')} />);
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(screen.getByText('View-only: edits are allowed only on the machine running Orbit')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New monitor' })).toBeNull();
  });

  it('without a backend shows that the server is unreachable and never invents data', async () => {
    const api = offlineApi();
    render(<ConsoleApp api={api} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the Orbit server");
    expect(screen.queryByText('Reconciliation queue')).toBeNull();
    expect(screen.queryByText('Showing demo data')).toBeNull();
    expect(screen.getByRole('link', { name: 'Explore with demo data' })).toHaveAttribute('href', expect.stringContaining('?demo'));
    expect(screen.queryByRole('button', { name: 'New monitor' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(api.getAccess).toHaveBeenCalledTimes(2);
  });

  it('demo data only when explicitly requested (?demo), creates a monitor with preview and returns saved', { timeout: 15_000 }, async () => {
    render(<ConsoleApp api={offlineApi()} demo />);
    expect(await screen.findByText('Reconciliation queue')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Showing demo data');
    expect(screen.getByRole('link', { name: 'Exit demo' })).toBeInTheDocument();
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

  it('the header has no "Change name" button', async () => {
    render(<ConsoleApp api={onlineApi('edit')} />);
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change name' })).toBeNull();
  });

  it('links to the wall in a new tab; language and appearance live in Settings, not in the header', async () => {
    render(<ConsoleApp api={onlineApi('edit')} />);
    const wall = await screen.findByRole('link', { name: /^Open wall/ });
    expect(wall).toHaveAttribute('href', '/wall.html');
    expect(wall).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('combobox', { name: 'Language' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Device preferences' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Customize' })).toBeNull();
  });

  it('renders in pt-BR', async () => {
    renderWithLocale(<ConsoleApp api={onlineApi('view-only')} />, 'pt-BR');
    expect(await screen.findByRole('heading', { name: 'Monitores' })).toBeInTheDocument();
    expect(screen.getByText('Somente leitura: edições só na máquina onde o Orbit roda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Abrir parede/ })).toBeInTheDocument();
  });
});

describe('FE-28 / FE-29 in the console', () => {
  it('Ctrl+K opens the palette and choosing a monitor action opens the form', async () => {
    render(<ConsoleApp api={onlineApi('edit')} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('New monitor{Enter}');
    expect(await screen.findByRole('heading', { name: 'New monitor' })).toBeInTheDocument();
  });

  it('the palette lists the monitors', async () => {
    render(<ConsoleApp api={onlineApi('edit')} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('option', { name: /Web portal/ })).toBeInTheDocument();
  });

  it('"N" opens a new monitor (edit mode only)', async () => {
    render(<ConsoleApp api={onlineApi('edit')} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('n');
    expect(await screen.findByRole('heading', { name: 'New monitor' })).toBeInTheDocument();
  });

  it('"N" does nothing in view-only mode', async () => {
    render(<ConsoleApp api={onlineApi('view-only')} />);
    await screen.findByText('Web portal');
    await userEvent.keyboard('n');
    expect(screen.queryByRole('heading', { name: 'New monitor' })).toBeNull();
  });
});
