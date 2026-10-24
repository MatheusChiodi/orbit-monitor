import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './Tooltip';

afterEach(() => vi.useRealTimers());

describe('FE-61 Tooltip', () => {
  it('shows on keyboard focus right away and describes the trigger', async () => {
    render(
      <Tooltip content="CERT_DAYS_LEFT > 14">
        <button type="button">Certificate rule</button>
      </Tooltip>,
    );
    await userEvent.tab();
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('CERT_DAYS_LEFT > 14');
    expect(screen.getByRole('button', { name: 'Certificate rule' })).toHaveAccessibleDescription('CERT_DAYS_LEFT > 14');
  });

  it('shows on hover after a short delay and hides on Escape', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <Tooltip content="Open the wall">
        <button type="button">Wall</button>
      </Tooltip>,
    );
    await userEvent.hover(screen.getByRole('button', { name: 'Wall' }));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Open the wall');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides when the pointer leaves', async () => {
    render(
      <Tooltip content="Hint" delay={0}>
        <button type="button">Target</button>
      </Tooltip>,
    );
    await userEvent.hover(screen.getByRole('button', { name: 'Target' }));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await userEvent.unhover(screen.getByRole('button', { name: 'Target' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
