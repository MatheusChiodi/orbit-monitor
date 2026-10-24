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

  it('FE-61: secondary by default; neutral stays as an alias', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary');
    expect(screen.getByRole('button').className).toContain('bg-s2');
  });

  it('FE-61: primary uses the accent token, never a status color', () => {
    render(<Button variant="primary">Save</Button>);
    expect(screen.getByRole('button').className).toContain('bg-accent');
    expect(screen.getByRole('button').className).toContain('text-on-accent');
  });

  it('FE-61: sizes sm and md map to the 32/36 px control heights', () => {
    render(
      <>
        <Button size="sm">S</Button>
        <Button>M</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'S' }).className).toContain('h-8');
    expect(screen.getByRole('button', { name: 'M' }).className).toContain('h-9');
  });

  it('FE-61: loading is busy, keeps its name and ignores clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAccessibleName('Save');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('FE-61: iconOnly renders a square button', () => {
    render(<Button iconOnly aria-label="Close">x</Button>);
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('size-9');
  });
});
