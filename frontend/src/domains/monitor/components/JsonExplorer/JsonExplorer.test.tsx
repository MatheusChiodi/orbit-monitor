import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { JsonExplorer } from './JsonExplorer';
import { jsonPathOf } from './jsonPath';

const PAN = '4111 1111 1111 1111';

const body = {
  status: 'UP',
  queue: { size: 42, oldest: '2026-10-18T17:00:00Z' },
  items: [{ value: 10 }, { value: 12 }],
  payer: { card_number: PAN, email: 'john.doe@example.com' },
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl',
};

describe('FE-35 JSON explorer', () => {
  describe('jsonPathOf (pure)', () => {
    it('builds JSONPath for keys, nested keys and array items', () => {
      expect(jsonPathOf(['queue', 'size'])).toBe('$.queue.size');
      expect(jsonPathOf(['items', 1, 'value'])).toBe('$.items[1].value');
      expect(jsonPathOf(['items', '*', 'value'])).toBe('$.items[*].value');
      expect(jsonPathOf(['odd key'])).toBe("$['odd key']");
    });
  });

  it('renders the response as an accessible tree', () => {
    render(<JsonExplorer value={body} onPick={vi.fn()} />);
    expect(screen.getByRole('tree', { name: 'Response body' })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /status/ })).toHaveTextContent('"UP"');
  });

  it('clicking a node creates a JSONPath field', async () => {
    const onPick = vi.fn();
    render(<JsonExplorer value={body} onPick={onPick} />);
    await userEvent.click(screen.getByRole('treeitem', { name: /queue/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add value at $.queue.size' }));
    expect(onPick).toHaveBeenCalledWith({ path: '$.queue.size', type: 'number' });
  });

  it('offers a wildcard for array items', async () => {
    const onPick = vi.fn();
    render(<JsonExplorer value={body} onPick={onPick} />);
    await userEvent.click(screen.getByRole('treeitem', { name: /items/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add value at $.items[*].value' }));
    expect(onPick).toHaveBeenCalledWith({ path: '$.items[*].value', type: 'number' });
  });

  it('keyboard: arrows move, Right expands, Left collapses, Enter picks', async () => {
    const onPick = vi.fn();
    render(<JsonExplorer value={body} onPick={onPick} />);
    const first = screen.getAllByRole('treeitem')[0]!;
    first.focus();
    await userEvent.keyboard('{ArrowDown}');
    const queue = screen.getByRole('treeitem', { name: /queue/ });
    expect(queue).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(queue).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(queue).toHaveAttribute('aria-expanded', 'false');
    first.focus();
    await userEvent.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith({ path: '$.status', type: 'text' });
  });

  it('never shows a full card number, e-mail or token', async () => {
    render(<JsonExplorer value={body} onPick={vi.fn()} defaultExpanded />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/4111\s?1111\s?1111\s?1111/);
    expect(text).toContain('•••• •••• •••• 1111');
    expect(text).not.toContain('john.doe@example.com');
    expect(text).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('PCI fields are flagged and cannot be picked as a series', async () => {
    const onPick = vi.fn();
    render(<JsonExplorer value={body} onPick={onPick} defaultExpanded />);
    expect(screen.getByText('PCI · masked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add value at $.payer.card_number' })).toBeNull();
  });

  it('copying a value copies only the masked text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<JsonExplorer value={body} onPick={vi.fn()} defaultExpanded />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy value of $.payer.card_number' }));
    expect(writeText).toHaveBeenCalledWith('•••• •••• •••• 1111');
  });

  it('empty or non-JSON bodies show a message', () => {
    render(<JsonExplorer value={null} onPick={vi.fn()} />);
    expect(screen.getByText('The response has no JSON body')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<JsonExplorer value={body} onPick={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('tree', { name: 'Corpo da resposta' })).toBeInTheDocument();
  });
});
