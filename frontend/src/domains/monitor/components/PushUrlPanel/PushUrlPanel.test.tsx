import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PushUrlPanel } from './PushUrlPanel';

describe('PushUrlPanel', () => {
  it('shows a new URL once with Copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PushUrlPanel url="http://orbit/api/push/s3cr3t" />);
    expect(screen.getByDisplayValue('http://orbit/api/push/s3cr3t')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('http://orbit/api/push/s3cr3t');
  });

  it('a hidden URL can be replaced after a confirmation', async () => {
    const onRegenerate = vi.fn().mockResolvedValue('http://orbit/api/push/n3w');
    render(<PushUrlPanel url={null} onRegenerate={onRegenerate} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Generate a new URL' }));
    const dialog = screen.getByRole('dialog', { name: 'Generate a new push URL?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Generate a new URL' }));
    expect(onRegenerate).toHaveBeenCalled();
    expect(await screen.findByDisplayValue('http://orbit/api/push/n3w')).toBeInTheDocument();
  });
});
