import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { domContains, makePan } from '@/test/sensitive';
import { NearLimit } from './NearLimit';

const pan = makePan();

describe('CORE-16 NearLimit privacy', () => {
  it('a PAN in the monitor name or meter label never reaches the DOM', () => {
    const { container } = render(
      <NearLimit
        items={[
          {
            headroom: 0.1,
            monitor: {
              id: 'm',
              name: `Card ${pan}`,
              groupId: 'g',
              type: 'SQL',
              status: 'OK',
              value: 90,
              rule: { field: 'QTY', operator: '<', limit: 100 },
              since: '2026-10-18T17:00:00.000Z',
            },
          },
        ]}
      />,
    );
    expect(domContains(container, pan)).toBe(false);
  });
});
