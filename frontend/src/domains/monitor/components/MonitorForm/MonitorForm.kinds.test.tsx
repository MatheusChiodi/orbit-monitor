import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MonitorForm, type MonitorFormProps } from './MonitorForm';

function setup(overrides: Partial<MonitorFormProps> = {}) {
  const props: MonitorFormProps = {
    groups: [{ id: 'pay', name: 'Payments' }],
    connections: [{ id: 'ora', name: 'Core Oracle', kind: 'ORACLE' }],
    onPreview: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    initialType: 'SQL',
    ...overrides,
  };
  render(<MonitorForm {...props} />);
  return props;
}

describe('MonitorForm: kinds, catalog, condition builder and JSON explorer', () => {
  it('shows the chosen kind and offers to change it while creating', async () => {
    const onChangeKind = vi.fn();
    setup({ initialType: 'HTTP', onChangeKind });
    expect(screen.getByText('Type: HTTP')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Change type' }));
    expect(onChangeKind).toHaveBeenCalled();
  });

  it('FE-33: choosing a connection loads its catalog for autocomplete', async () => {
    const onLoadCatalog = vi.fn().mockResolvedValue([{ schema: 'APP', name: 'ORDERS', columns: [{ name: 'ID', type: 'NUMBER' }] }]);
    setup({ onLoadCatalog });
    await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
    expect(onLoadCatalog).toHaveBeenCalledWith('ora');
    const editor = screen.getByRole('textbox', { name: 'SQL query' });
    fireEvent.change(editor, { target: { value: 'SELECT * FROM ' } });
    editor.focus();
    await userEvent.keyboard('{Control>} {/Control}');
    expect(await screen.findByRole('option', { name: 'ORDERS' })).toBeInTheDocument();
  });

  it('BE-12: saved queries of the chosen connection (orbit.query-catalog.json) fill the editor', async () => {
    const onLoadSavedQueries = vi.fn().mockResolvedValue([{ id: 'q1', name: 'Pending refunds', connectionId: 'ora', sql: 'SELECT COUNT(*) QTY FROM REFUNDS' }]);
    setup({ onLoadSavedQueries });
    await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
    expect(onLoadSavedQueries).toHaveBeenCalledWith('ora');
    await userEvent.selectOptions(await screen.findByLabelText('Saved query'), 'q1');
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toHaveValue('SELECT COUNT(*) QTY FROM REFUNDS');
  });

  it('FE-33: a failing catalog request only disables suggestions', async () => {
    setup({ onLoadCatalog: vi.fn().mockRejectedValue(new Error('404')) });
    await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
    expect(await screen.findByText('Table suggestions are unavailable for this connection.')).toBeInTheDocument();
  });

  it('FE-34: rules are edited with fields, or as text on demand', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Conditions/ }));
    expect(screen.getByRole('button', { name: 'Add rule' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Edit as text' })).toBeInTheDocument();
  });

  it('FE-35: an HTTP preview with a JSON body offers the explorer in Data; picking adds the value', async () => {
    setup({
      initialType: 'HTTP',
      onPreview: vi.fn().mockResolvedValue({
        columns: [{ name: '$.status', type: 'text' }],
        rows: [{ '$.status': 'UP' }],
        elapsedMs: 50,
        status: 200,
        body: '{"status":"UP","queue":{"size":42}}',
      }),
    });
    await userEvent.type(screen.getByLabelText('URL'), 'https://portal/health');
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    await screen.findByText('HTTP 200');
    await userEvent.click(screen.getByRole('button', { name: 'Next: Data' }));
    await userEvent.click(screen.getByText('Add a value from the response'));
    const tree = screen.getByRole('tree', { name: 'Response body' });
    await userEvent.click(within(tree).getByRole('treeitem', { name: 'queue' }));
    await userEvent.click(within(tree).getByRole('button', { name: 'Add value at $.queue.size' }));
    expect(screen.getByRole('group', { name: 'Size' })).toBeInTheDocument();
  });

  it('kinds without a preview explain it, skip Data and save with their own condition fields', async () => {
    const p = setup({ initialType: 'TCP' });
    expect(screen.getByText("This monitor type has no live preview; conditions use the probe's own fields.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run preview' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Next: Conditions' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), 'Postgres port');
    await userEvent.type(screen.getByLabelText('Host'), 'db.internal');
    await userEvent.type(screen.getByLabelText('Port'), '5432');
    await userEvent.click(screen.getByRole('button', { name: 'Add monitor' }));
    expect(p.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TCP',
        host: 'db.internal',
        port: 5432,
        name: 'Postgres port',
        groupId: 'pay',
        conditions: [{ field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' }],
      }),
    );
  });

  it('kind errors are listed before saving', async () => {
    const p = setup({ initialType: 'KAFKA' });
    await userEvent.click(screen.getByRole('button', { name: 'Add monitor' }));
    expect(screen.getByText('Enter the bootstrap servers and the consumer group')).toBeInTheDocument();
    expect(p.onSave).not.toHaveBeenCalled();
  });

  it('BE-14: a slow SELECT shows the cost warning and offers the suggested interval', async () => {
    const onPreview = vi.fn().mockResolvedValue({
      columns: [{ name: 'QTY', type: 'number' }],
      rows: [{ QTY: 1 }],
      elapsedMs: 4200,
      cost: { level: 'WARN', suggestedIntervalSeconds: 300, message: 'This query took 4.2 s; run it every 300 s or more.' },
    });
    setup({ onPreview });
    await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT COUNT(*) QTY FROM Q' } });
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(onPreview).toHaveBeenCalledWith({ type: 'SQL', connectionId: 'ora', sql: 'SELECT COUNT(*) QTY FROM Q', intervalSeconds: 60 });
    expect(await screen.findByText('This query took 4.2 s; run it every 300 s or more.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use 300 s' }));
    expect(screen.getByLabelText('Interval (s)')).toHaveValue(300);
  });
});
