import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { KindChooser } from './KindChooser';

describe('KindChooser', () => {
  it('offers two big choices first', async () => {
    const onChoose = vi.fn();
    render(<KindChooser onChoose={onChoose} onTemplate={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Website or API/ }));
    expect(onChoose).toHaveBeenLastCalledWith('HTTP');
    await userEvent.click(screen.getByRole('button', { name: /Database query/ }));
    expect(onChoose).toHaveBeenLastCalledWith('SQL');
  });

  it('keeps the other kinds behind a disclosure', async () => {
    const onChoose = vi.fn();
    render(<KindChooser onChoose={onChoose} onTemplate={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Other kinds' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Kafka lag' })).toBeNull();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'Kafka lag' }));
    expect(onChoose).toHaveBeenCalledWith('KAFKA');
  });

  it('starts from a template', async () => {
    const onTemplate = vi.fn();
    render(<KindChooser onChoose={vi.fn()} onTemplate={onTemplate} />);
    expect(screen.queryByRole('radio', { name: 'Blank monitor' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Use template' }));
    expect(onTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: 'spring-actuator-health' }));
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<KindChooser onChoose={vi.fn()} onTemplate={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('heading', { name: 'O que você quer observar?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Site ou API/ })).toBeInTheDocument();
  });
});
