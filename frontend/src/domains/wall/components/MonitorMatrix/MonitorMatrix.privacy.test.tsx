import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { domContains, makePan } from '@/test/sensitive';
import { MonitorMatrix } from './MonitorMatrix';

const pan = makePan();

describe('CORE-16 MonitorMatrix privacy', () => {
  it('a PAN in a cell name, title or value never reaches the DOM', () => {
    const { container } = render(
      <MonitorMatrix
        rows={[
          {
            group: { id: 'g', name: `Cards ${pan}` },
            status: 'DOWN',
            summary: { ok: 0, total: 1, status: 'DOWN' },
            monitors: [
              { id: 'm', name: `Card ${pan}`, groupId: 'g', type: 'SQL', status: 'DOWN', value: Number(pan), since: '2026-10-18T17:00:00.000Z' },
            ],
          },
        ]}
        unownedMonitorIds={new Set()}
      />,
    );
    expect(domContains(container, pan)).toBe(false);
  });
});
