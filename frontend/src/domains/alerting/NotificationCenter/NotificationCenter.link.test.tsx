import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotificationCenter } from './NotificationCenter';

describe('FE-38 notification links', () => {
  it('a notification with href links its title and following it marks it read and closes the feed', async () => {
    const onRead = vi.fn();
    const now = new Date();
    render(
      <NotificationCenter
        notifications={[{ id: 'a', severity: 'DOWN', title: 'Checkout down', detail: '', at: now.toISOString(), read: false, href: '#/incidents/a' }]}
        now={now}
        onRead={onRead}
        onReadAll={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    const link = screen.getByRole('link', { name: 'Checkout down' });
    expect(link).toHaveAttribute('href', '#/incidents/a');
    await userEvent.click(link);
    expect(onRead).toHaveBeenCalledWith('a');
    expect(screen.queryByRole('list', { name: 'Incident feed' })).toBeNull();
  });
});
