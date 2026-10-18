import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza o texto e dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Reconhecer</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Reconhecer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('é type="button" por padrão', () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('aplica a variante como data-variant', () => {
    render(<Button variant="danger">Fora</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');
  });

  it('desabilitado não dispara clique', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        X
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('largura total quando block', () => {
    render(<Button block>Y</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });
});
