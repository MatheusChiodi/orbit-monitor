import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders the text and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Acknowledge</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is type="button" by default', () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('applies the variant as data-variant', () => {
    render(<Button variant="danger">Down</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');
  });

  it('a disabled button does not fire clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        X
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('full width when block', () => {
    render(<Button block>Y</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });
});
