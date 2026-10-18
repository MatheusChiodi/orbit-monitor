import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOperatorStore } from '@/domains/security/operator';
import { makePan } from '@/test/sensitive';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

const pan = makePan();

function api(): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    listGroups: vi.fn().mockResolvedValue([{ id: 'g', name: 'Payments' }]),
    listMonitors: vi.fn().mockResolvedValue([]),
    listConnections: vi.fn().mockResolvedValue([{ id: 'c', name: 'Core', kind: 'ORACLE' }]),
    previewMonitor: vi.fn().mockResolvedValue({
      columns: [{ name: 'CARD', type: 'text' }],
      rows: [{ CARD: pan }],
      elapsedMs: 5,
    }),
    createMonitor: vi.fn(),
  };
}

function browserStorageDump(): string {
  const dump: string[] = [];
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)!;
      dump.push(key, storage.getItem(key) ?? '');
    }
  }
  return dump.join('\n');
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

async function runPreview() {
  const store = createOperatorStore();
  store.getState().setName('M. Chiodi');
  render(<ConsoleApp api={api()} operatorStore={store} />);
  await userEvent.click(await screen.findByRole('button', { name: 'New monitor' }));
  await userEvent.selectOptions(await screen.findByLabelText('Connection'), 'c');
  fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT CARD FROM X' } });
  await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
  await screen.findByRole('table', { name: 'Preview result' });
}

describe('CORE-16 probe payloads never leave memory', () => {
  it('nothing from the preview is written to localStorage or sessionStorage', async () => {
    await runPreview();
    expect(browserStorageDump()).not.toContain(pan);
    expect(browserStorageDump()).not.toContain(pan.slice(-4));
  });

  it('IndexedDB is never opened', async () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });
    await runPreview();
    expect(open).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('payloads are never logged to the console', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    await runPreview();
    const logged = spies.flatMap((s) => s.mock.calls.flat()).map((v) => JSON.stringify(v) ?? String(v)).join(' ');
    expect(logged).not.toContain(pan);
  });
});
