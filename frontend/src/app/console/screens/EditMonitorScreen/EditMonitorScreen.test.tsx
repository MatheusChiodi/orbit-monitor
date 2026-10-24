import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleProvider, type ConsoleContextValue } from '../../ConsoleContext';
import type { ConsoleSource } from '../../consoleSource';
import EditMonitorScreen from './EditMonitorScreen';
import { NewMonitorScreen } from '../NewMonitorScreen';

const definition = {
  type: 'HTTP',
  id: 'req_portal',
  name: 'Portal',
  groupId: 'web',
  method: 'GET',
  url: 'https://portal.example/health',
  headers: {},
  secretHeaders: { Authorization: '•••• (vault)' },
  intervalSeconds: 30,
  timeoutMs: 5000,
  downAfter: 2,
  paused: true,
  hysteresis: 0.1,
  conditions: [
    { expression: '[RESPONSE_TIME] <= 1000', level: 'WARN' },
    { expression: '[BODY].name contains shop', level: 'DOWN' },
  ],
  fields: [],
};

function source(overrides: Partial<ConsoleSource> = {}): ConsoleSource {
  return {
    getMonitor: vi.fn().mockResolvedValue({ definition, status: { id: 'req_portal', name: 'Portal' } }),
    listGroups: vi.fn().mockResolvedValue([{ id: 'web', name: 'Web' }]),
    listConnections: vi.fn().mockResolvedValue([]),
    createMonitor: vi.fn().mockResolvedValue({}),
    saveGroup: vi.fn(),
    ...overrides,
  } as unknown as ConsoleSource;
}

function renderIn(ui: ReactElement, src: ConsoleSource, navigate = vi.fn()) {
  const value: ConsoleContextValue = { source: src, access: { mode: 'edit', client: 'loopback' }, editable: true, demo: false, navigate };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ConsoleProvider value={value}>{ui}</ConsoleProvider>
    </QueryClientProvider>,
  );
  return navigate;
}

describe('EditMonitorScreen', () => {
  it('loads the monitor into the form and saves the changes with its id and untouched settings', async () => {
    const src = source();
    const navigate = renderIn(<EditMonitorScreen id="req_portal" />, src);
    expect(await screen.findByDisplayValue('Portal')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Portal health');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(vi.mocked(src.createMonitor).mock.calls[0]![0]).toMatchObject(
      {
        id: 'req_portal',
        name: 'Portal health',
        paused: true,
        hysteresis: 0.1,
        headers: { Authorization: '•••• (vault)' },
        conditions: [
          { field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' },
          { expression: '[BODY].name contains shop', level: 'DOWN' },
        ],
      },
    );
    expect(navigate).toHaveBeenCalledWith({ name: 'monitor', id: 'req_portal' });
  });

  it('explains a monitor that cannot be loaded', async () => {
    renderIn(<EditMonitorScreen id="gone" />, source({ getMonitor: vi.fn().mockRejectedValue(new Error('Monitor gone not found')) }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('NewMonitorScreen', () => {
  it('starts with the kind chooser and opens the form for the chosen kind', async () => {
    const navigate = renderIn(<NewMonitorScreen onSaved={vi.fn()} />, source());
    await userEvent.click(await screen.findByRole('button', { name: /Website or API/ }));
    expect(navigate).toHaveBeenCalledWith({ name: 'new-monitor', kind: 'HTTP' });
  });

  it('duplicates a monitor from ?from=, without its id and secrets', async () => {
    window.location.hash = '#/monitors/new?from=req_portal';
    const src = source();
    renderIn(<NewMonitorScreen onSaved={vi.fn()} />, src);
    expect(await screen.findByDisplayValue('Copy of Portal')).toBeInTheDocument();
    expect(screen.getByText('Secrets are not copied. Type them again before saving.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add monitor' }));
    const saved = vi.mocked(src.createMonitor).mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(saved.id).toBeUndefined();
    expect(saved.headers).toEqual({});
    expect(saved.name).toBe('Copy of Portal');
    window.location.hash = '';
  });
});
