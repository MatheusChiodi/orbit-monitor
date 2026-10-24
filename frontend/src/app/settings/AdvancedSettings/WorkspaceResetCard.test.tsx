import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { WorkspaceResetCard } from './WorkspaceResetCard';

afterEach(() => dismissAllToasts());

describe('Settings › Advanced › Restore workspace defaults', () => {
  it('says what is kept, asks first, then resets and reloads', async () => {
    const reset = vi.fn().mockResolvedValue(['defaults']);
    const onDone = vi.fn();
    render(
      <>
        <WorkspaceResetCard reset={reset} onDone={onDone} />
        <ToastViewport />
      </>,
    );
    expect(screen.getAllByText(/Monitors, layouts, connections and this device's choices are kept/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Restore workspace defaults…' }));
    expect(reset).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Restore workspace defaults?' })).getByRole('button', { name: 'Restore defaults' }));
    expect(reset).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
    expect(await screen.findByText('Workspace defaults restored')).toBeInTheDocument();
  });

  it('a failure is reported and nothing is reloaded', async () => {
    const onDone = vi.fn();
    render(
      <>
        <WorkspaceResetCard reset={vi.fn().mockRejectedValue(new Error('403'))} onDone={onDone} />
        <ToastViewport />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Restore workspace defaults…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restore defaults' }));
    expect(await screen.findByText('Could not restore: 403')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
