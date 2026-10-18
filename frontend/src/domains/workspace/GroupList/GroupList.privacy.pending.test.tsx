import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { domContains, makePan } from '@/test/sensitive';
import { GroupList } from './GroupList';

const pan = makePan();

describe('CORE-16 GroupList privacy', () => {
  it('a PAN in a monitor name or value never reaches the DOM', () => {
    const { container } = render(
      <GroupList
        groups={[{ id: 'g', name: 'Payments' }]}
        monitors={[{ id: 'm', name: `Card ${pan}`, groupId: 'g', type: 'SQL', status: 'OK', value: Number(pan), since: '2026-10-18T17:00:00.000Z' }]}
        onNewMonitor={vi.fn()}
      />,
    );
    expect(domContains(container, pan)).toBe(false);
  });
});
