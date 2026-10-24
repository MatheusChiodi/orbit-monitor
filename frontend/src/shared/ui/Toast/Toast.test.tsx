import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { StickyActionBar } from '../StickyActionBar';
import { ToastViewport, dismissAllToasts, useToast } from './Toast';

function Trigger() {
  const { toast } = useToast();
  return (
    <Button onClick={() => toast({ title: 'Monitor saved', action: { label: 'Undo', onClick: () => {} } })}>Save monitor</Button>
  );
}

afterEach(() => {
  act(() => dismissAllToasts());
  vi.useRealTimers();
});

describe('FE-61 Toast', () => {
  it('useToast shows a polite status message in the viewport', async () => {
    render(
      <>
        <Trigger />
        <ToastViewport />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save monitor' }));
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveTextContent('Monitor saved');
    expect(screen.getByRole('status')).toHaveTextContent('Monitor saved');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('can be dismissed and disappears on its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <>
        <Trigger />
        <ToastViewport />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save monitor' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Monitor saved')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save monitor' }));
    act(() => vi.advanceTimersByTime(8100));
    expect(screen.queryByText('Monitor saved')).not.toBeInTheDocument();
  });

  it('an error toast is an alert', async () => {
    function ErrorTrigger() {
      const { toast } = useToast();
      return <Button onClick={() => toast({ title: 'Could not save', tone: 'DOWN' })}>Go</Button>;
    }
    render(
      <>
        <ErrorTrigger />
        <ToastViewport />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  });

  it('never covers a sticky action bar: the viewport sits above its height', () => {
    render(
      <>
        <StickyActionBar>
          <Button variant="primary">Save monitor</Button>
        </StickyActionBar>
        <ToastViewport />
      </>,
    );
    expect(document.documentElement.style.getPropertyValue('--sticky-bar-height')).not.toBe('');
    expect(screen.getByRole('region', { name: 'Notifications' }).getAttribute('style')).toContain('--sticky-bar-height');
  });
});
