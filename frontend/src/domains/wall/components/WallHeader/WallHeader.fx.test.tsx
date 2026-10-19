import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WallHeader } from './WallHeader';

const now = new Date(2026, 9, 18, 17, 10, 0);
const counts = { down: 1, warn: 0, ok: 1, total: 2 };

describe('FE-59 WallHeader mini orb', () => {
  it('shows the global state as a mini orb next to the status pill', () => {
    render(
      <WallHeader
        environment="Production"
        counts={counts}
        now={now}
        updatedAt={null}
        connection="open"
        orb={{
          uptime24h: 99,
          groups: [{ id: 'g', name: 'Payments' }],
          monitors: [
            { id: 'a', name: 'A', groupId: 'g', type: 'HTTP', status: 'DOWN', value: null, since: now.toISOString() },
            { id: 'b', name: 'B', groupId: 'g', type: 'HTTP', status: 'OK', value: 1, since: now.toISOString() },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('mini-orb')).toHaveAttribute('data-core', 'DOWN');
    expect(screen.getByRole('status')).toHaveTextContent('1 monitor down');
  });

  it('without data there is no mini orb', () => {
    render(<WallHeader environment="Production" counts={counts} now={now} updatedAt={null} connection="open" />);
    expect(screen.queryByTestId('mini-orb')).toBeNull();
  });
});
