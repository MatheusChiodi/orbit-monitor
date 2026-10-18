import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { domContains, makePan } from '@/test/sensitive';
import { AlsoActive } from './AlsoActive';

const pan = makePan();
const now = new Date(2026, 9, 18, 17, 10, 0);

describe('CORE-16 AlsoActive privacy', () => {
  it('a PAN in the monitor or group name never reaches the DOM', () => {
    const monitor: MonitorView = {
      id: 'm',
      name: `Card ${pan}`,
      groupId: 'g',
      type: 'SQL',
      status: 'WARN',
      value: Number(pan),
      since: now.toISOString(),
    };
    const { container } = render(<AlsoActive monitors={[monitor]} groups={[{ id: 'g', name: `G ${pan}` }]} now={now} />);
    expect(domContains(container, pan)).toBe(false);
  });
});
