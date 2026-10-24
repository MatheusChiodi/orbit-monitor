import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDisplay } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { DataDisplayStep } from './DataDisplayStep';

const fields: FieldDisplay[] = [
  { field: 'PENDING_QTY', selected: true, label: 'Pending', format: 'integer', storeAsSeries: true, display: 'number' },
  { field: 'LAST_BATCH_AT', selected: true, label: 'Last batch', format: 'relative', storeAsSeries: false, display: 'text' },
  { field: '[ROWS]', selected: false, label: 'Rows', format: 'integer', storeAsSeries: false, display: 'hidden' },
];

describe('FE-14 reorder fields in Data & display', () => {
  it('each field has a drag handle reachable by keyboard', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reorder Pending' })).toBeInTheDocument();
  });

  it('Space + ArrowDown + Space moves a field down', async () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    screen.getByRole('button', { name: 'Reorder Pending' }).focus();
    await userEvent.keyboard(' {ArrowDown} ');
    expect(onChange).toHaveBeenLastCalledWith([fields[1], fields[0], fields[2]]);
    expect(screen.getByRole('status')).toHaveTextContent('Pending moved to position 2 of 3');
  });

  it('Esc cancels the reorder', async () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    screen.getByRole('button', { name: 'Reorder Pending' }).focus();
    await userEvent.keyboard(' {ArrowDown}{Escape}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('handle label in pt-BR', () => {
    renderWithLocale(<DataDisplayStep fields={fields} onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Reordenar Pending' })).toBeInTheDocument();
  });
});
