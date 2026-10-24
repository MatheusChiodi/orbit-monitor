import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Table, type TableColumn } from './Table';

interface Row {
  id: string;
  name: string;
  availability: number;
}

const COLUMNS: TableColumn<Row>[] = [
  { key: 'name', header: 'Monitor', cell: (r) => r.name },
  { key: 'availability', header: 'Availability', align: 'end', cell: (r) => `${r.availability}%` },
];
const ROWS: Row[] = [
  { id: 'a', name: 'Checkout API', availability: 99.9 },
  { id: 'b', name: 'Orders DB', availability: 98.2 },
];

describe('FE-61 Table', () => {
  it('renders a captioned table with column headers and cells', () => {
    render(<Table caption="Availability by monitor" columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);
    const table = screen.getByRole('table', { name: 'Availability by monitor' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Monitor', 'Availability']);
    expect(within(table).getByRole('cell', { name: '98.2%' })).toBeInTheDocument();
  });

  it('labels every cell with its column for the stacked mobile layout', () => {
    render(<Table caption="x" columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);
    expect(screen.getByRole('cell', { name: '99.9%' })).toHaveAttribute('data-label', 'Availability');
    expect(screen.getByRole('table')).toHaveClass('ui-table');
  });

  it('clickable rows open with click and keyboard', async () => {
    const onRowClick = vi.fn();
    render(<Table caption="x" columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} onRowClick={onRowClick} rowLabel={(r) => `Open ${r.name}`} />);
    await userEvent.click(screen.getByRole('cell', { name: 'Orders DB' }));
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[1]);
    const first = screen.getByRole('row', { name: /Checkout API/ });
    first.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[0]);
  });

  it('shows an empty message when there are no rows', () => {
    render(<Table caption="x" columns={COLUMNS} rows={[]} getRowKey={(r) => r.id} />);
    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument();
  });

  it('hideOnMobile columns are marked for the stacked layout (CSS hides them below 640 px)', () => {
    const columns: TableColumn<Row>[] = [...COLUMNS, { key: 'id', header: 'Id', cell: (r) => r.id, hideOnMobile: true }];
    render(<Table caption="x" columns={columns} rows={ROWS} getRowKey={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: 'Id' })).toHaveAttribute('data-hide-mobile');
    expect(screen.getByRole('cell', { name: 'a' })).toHaveAttribute('data-hide-mobile');
    expect(screen.getByRole('cell', { name: 'Checkout API' })).not.toHaveAttribute('data-hide-mobile');
  });
});
