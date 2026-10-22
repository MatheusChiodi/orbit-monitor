import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../mock';
import { createMonitorActionHandler } from './monitorActions';

const now = new Date(2026, 9, 18, 17, 10, 0);
const snapshot = mockSnapshot('incident', now);

describe('FE-55 card actions on the wall', () => {
  it('acknowledge acknowledges the open, unacknowledged incident of the monitor (allowed for view-only clients)', () => {
    const onAcknowledge = vi.fn();
    const handle = createMonitorActionHandler(snapshot, { onAcknowledge, navigate: vi.fn() });
    handle('acknowledge', 'reconciliation');
    expect(onAcknowledge).toHaveBeenCalledWith('inc-reconciliation');
  });

  it('acknowledge does nothing for a monitor without an open incident or one already acknowledged', () => {
    const onAcknowledge = vi.fn();
    const handle = createMonitorActionHandler(snapshot, { onAcknowledge, navigate: vi.fn() });
    handle('acknowledge', 'tablespace');
    handle('acknowledge', snapshot.monitors.find((m) => m.status === 'OK')!.id);
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it('open-detail and open-target open the incident page in the console, or the monitor list', () => {
    const navigate = vi.fn();
    const handle = createMonitorActionHandler(snapshot, { onAcknowledge: vi.fn(), navigate });
    handle('open-detail', 'reconciliation');
    expect(navigate).toHaveBeenLastCalledWith('/index.html#/incidents/inc-reconciliation');
    handle('open-target', 'payments-api');
    expect(navigate).toHaveBeenLastCalledWith('/index.html#monitor-payments-api');
  });
});
