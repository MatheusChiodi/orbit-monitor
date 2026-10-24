import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { NotificationCenter, type AppNotification } from './NotificationCenter';

const now = new Date(2026, 9, 18, 17, 10, 0);
const notifications: AppNotification[] = [
  { id: 'n1', severity: 'DOWN', title: 'Reconciliation queue down', detail: 'QTY = 349 · rule QTY < 200', at: new Date(2026, 9, 18, 17, 6).toISOString(), read: false },
  { id: 'n2', severity: 'WARN', title: 'Acquirer error rate warning', detail: 'ERROR_PCT = 1.7', at: new Date(2026, 9, 18, 17, 1).toISOString(), read: false },
  { id: 'n3', severity: 'OK', title: 'Invoice issuing recovered', detail: '', at: new Date(2026, 9, 18, 15, 35).toISOString(), read: true },
];

afterEach(() => vi.useRealTimers());

describe('FE-38 notification center', () => {
  it('the bell states the unread count in text', () => {
    render(<NotificationCenter notifications={notifications} now={now} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Notifications (2 unread)' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a feed with newest first and state labels', async () => {
    render(<NotificationCenter notifications={notifications} now={now} onRead={vi.fn()} onReadAll={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    const feed = screen.getByRole('list', { name: 'Incident feed' });
    const items = within(feed).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Down');
    expect(items[0]).toHaveTextContent('Reconciliation queue down');
    expect(items[0]).toHaveTextContent('4 min ago');
  });

  it('marks one or all as read', async () => {
    const onRead = vi.fn();
    const onReadAll = vi.fn();
    render(<NotificationCenter notifications={notifications} now={now} onRead={onRead} onReadAll={onReadAll} />);
    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark Reconciliation queue down as read' }));
    expect(onRead).toHaveBeenCalledWith('n1');
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(onReadAll).toHaveBeenCalled();
  });

  it('Escape closes the feed and focus returns to the bell', async () => {
    render(<NotificationCenter notifications={notifications} now={now} onRead={vi.fn()} onReadAll={vi.fn()} />);
    const bell = screen.getByRole('button', { name: /Notifications/ });
    await userEvent.click(bell);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('list', { name: 'Incident feed' })).toBeNull();
    expect(bell).toHaveFocus();
  });

  it('empty feed', async () => {
    render(<NotificationCenter notifications={[]} now={now} onRead={vi.fn()} onReadAll={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('No notifications in the last 24 h')).toBeInTheDocument();
  });

  it('a click outside closes the feed', async () => {
    render(
      <>
        <p>outside</p>
        <NotificationCenter notifications={notifications} now={now} onRead={vi.fn()} onReadAll={vi.fn()} />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('list', { name: 'Incident feed' })).toBeInTheDocument();
    await userEvent.click(screen.getByText('outside'));
    expect(screen.queryByRole('list', { name: 'Incident feed' })).toBeNull();
  });

  it('a card number in a notification detail is masked', async () => {
    const leak = { ...notifications[0]!, detail: 'PAN 4111 1111 1111 1111 rejected' };
    render(<NotificationCenter notifications={[leak]} now={now} onRead={vi.fn()} onReadAll={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(document.body.textContent).not.toMatch(/4111\s?1111\s?1111\s?1111/);
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<NotificationCenter notifications={notifications} now={now} onRead={vi.fn()} onReadAll={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Notificações (2 não lidas)' })).toBeInTheDocument();
  });
});
