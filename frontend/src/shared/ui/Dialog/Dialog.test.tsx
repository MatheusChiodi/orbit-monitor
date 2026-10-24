import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Dialog } from './Dialog';

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add connection</Button>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Add connection"
        description="Orbit only runs SELECT queries."
        footer={<Button variant="primary">Save connection</Button>}
      >
        <label>
          Name <input />
        </label>
      </Dialog>
    </>
  );
}

describe('FE-61 Dialog', () => {
  it('is a modal dialog labelled by its title and described by its description', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Add connection' }));
    const dialog = screen.getByRole('dialog', { name: 'Add connection' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Orbit only runs SELECT queries.');
    expect(screen.getByRole('button', { name: 'Save connection' })).toBeInTheDocument();
  });

  it('moves focus inside on open, traps Tab and returns focus on Escape', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Add connection' });
    await userEvent.click(trigger);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes from the close button', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Add connection' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
