import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PreviewResult } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { initialFormState } from '../../form';
import { MonitorForm, type MonitorFormProps } from './MonitorForm';

const groups = [{ id: 'pay', name: 'Payments' }];
const connections = [{ id: 'ora', name: 'Core Oracle', kind: 'ORACLE' as const }];
const sqlPreview: PreviewResult = { columns: [{ name: 'QTY', type: 'number' }], rows: [{ QTY: 347 }], elapsedMs: 120 };
const httpPreview: PreviewResult = {
  columns: [
    { name: '[STATUS]', type: 'number' },
    { name: '[RESPONSE_TIME]', type: 'number' },
    { name: '$.mode', type: 'text' },
  ],
  rows: [{ '[STATUS]': 200, '[RESPONSE_TIME]': 111, '$.mode': 'edit' }],
  elapsedMs: 111,
  status: 200,
  body: '{"mode":"edit"}',
};

function setup(overrides: Partial<MonitorFormProps> = {}) {
  const p: MonitorFormProps = {
    groups,
    connections,
    onPreview: vi.fn().mockResolvedValue(httpPreview),
    onSave: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<MonitorForm {...p} />);
  return p;
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Add monitor' }));

describe('MonitorForm (guided flow)', () => {
  it('starts on HTTP with a stepper and Save always in the action bar', () => {
    setup();
    const steps = within(screen.getByRole('navigation', { name: 'Monitor steps' })).getAllByRole('button');
    expect(steps.map((s) => s.textContent)).toEqual(['1Target', '2Data', '3Conditions', '4Review']);
    expect(screen.getByRole('heading', { name: 'Target' })).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add monitor' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next: Data' })).toBeInTheDocument();
  });

  it('a disabled preview says why', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    expect(screen.getByText(/^To run a preview:/)).toBeInTheDocument();
  });

  it('new HTTP monitors come with sensible rules', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Conditions/ }));
    expect(screen.getByText('Down when HTTP status is outside 200 to 299')).toBeInTheDocument();
    expect(screen.getByText('Warning when Response time is above 1000 ms')).toBeInTheDocument();
  });

  it('HTTP preview: built-in values appear once in Data, with friendly names', async () => {
    const p = setup();
    await userEvent.type(screen.getByLabelText('URL'), 'https://portal/health');
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(p.onPreview).toHaveBeenCalledWith({ type: 'HTTP', method: 'GET', url: 'https://portal/health', headers: {} });
    await screen.findByText('HTTP 200');
    await userEvent.click(screen.getByRole('button', { name: 'Next: Data' }));
    expect(screen.getAllByRole('group', { name: 'HTTP status' })).toHaveLength(1);
    expect(screen.getAllByRole('group', { name: 'Response time' })).toHaveLength(1);
  });

  it('saves the definition with the default rules in server syntax', async () => {
    const p = setup();
    await userEvent.type(screen.getByLabelText('Name'), 'Portal');
    await userEvent.type(screen.getByLabelText('URL'), 'https://portal/health');
    await save();
    expect(p.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Portal',
        groupId: 'pay',
        type: 'HTTP',
        conditions: [
          { field: '[STATUS]', operator: 'between', value: '200 and 299', level: 'DOWN' },
          { field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' },
        ],
      }),
    );
  });

  it('a fresh install creates the Default group on save', async () => {
    const onCreateGroup = vi.fn().mockResolvedValue({ id: 'default', name: 'Default' });
    const p = setup({ groups: [], onCreateGroup });
    await userEvent.type(screen.getByLabelText('Name'), 'Portal');
    await userEvent.type(screen.getByLabelText('URL'), 'https://portal/health');
    await save();
    expect(onCreateGroup).toHaveBeenCalledWith({ id: 'default', name: 'Default', order: 0 });
    expect(p.onSave).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'default' }));
  });

  it('saving with missing fields says what to fix and returns to Target', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: /Review/ }));
    await save();
    expect(p.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Target' })).toBeInTheDocument();
    expect(screen.getByText('Enter the name')).toBeInTheDocument();
    expect(screen.getByText(/things? to fix before saving/)).toBeInTheDocument();
  });

  it('a server error stays on screen', async () => {
    setup({ onSave: vi.fn().mockRejectedValue(new Error('url: blocked address')) });
    await userEvent.type(screen.getByLabelText('Name'), 'Portal');
    await userEvent.type(screen.getByLabelText('URL'), 'https://portal/health');
    await save();
    expect(await screen.findByText('url: blocked address')).toBeInTheDocument();
  });

  it('SQL: a connection added from the form is selected and tested', async () => {
    const onSaveConnection = vi.fn().mockImplementation(async (id: string, input: { name: string }) => ({ id, name: input.name, kind: 'POSTGRES' }));
    const onTestConnection = vi.fn().mockResolvedValue({ ok: false, ms: 10_000, error: 'Connection failed: timed out' });
    setup({ initialType: 'SQL', connections: [], onSaveConnection, onTestConnection, onPreview: vi.fn().mockResolvedValue(sqlPreview) });
    await userEvent.click(screen.getByRole('button', { name: 'Add connection' }));
    const dialog = screen.getByRole('dialog', { name: 'Add connection' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Orders');
    await userEvent.type(within(dialog).getByLabelText('JDBC URL'), 'jdbc:postgresql://db/orders');
    await userEvent.type(within(dialog).getByLabelText('User'), 'orbit');
    await userEvent.type(within(dialog).getByLabelText('Password'), 'x');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save connection' }));
    expect(screen.getByLabelText('Connection')).toHaveValue('orders');
    expect(onTestConnection).toHaveBeenCalledWith('orders');
    expect(await screen.findByText("Couldn't connect. Connection failed: timed out")).toBeInTheDocument();
  });

  it('SQL: preview fills Data and a rule is checked against it', async () => {
    const p = setup({ initialType: 'SQL', onPreview: vi.fn().mockResolvedValue(sqlPreview) });
    await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT COUNT(*) QTY FROM QUEUE' } });
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(p.onPreview).toHaveBeenCalledWith({ type: 'SQL', connectionId: 'ora', sql: 'SELECT COUNT(*) QTY FROM QUEUE', intervalSeconds: 60 });
    expect(await screen.findByRole('table', { name: 'Preview result' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Conditions/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Value' }), { target: { value: 'QTY' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Limit' }), { target: { value: '200' } });
    expect(screen.getByText('Down when Qty is above 200')).toBeInTheDocument();
    expect(screen.getByText('This condition would fail now (Down)')).toBeInTheDocument();
  });

  it('edit mode starts from the saved monitor and says "Save changes"', async () => {
    const p = setup({ mode: 'edit', initialState: { ...initialFormState(), type: 'HTTP', name: 'Portal', groupId: 'pay', url: 'https://portal/health' } });
    expect(screen.getByLabelText('Name')).toHaveValue('Portal');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(p.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Portal', url: 'https://portal/health', conditions: [] }));
  });

  it('SQL: the SELECT can be kept in the query catalog', async () => {
    const onSaveSavedQuery = vi.fn().mockImplementation(async (q) => q);
    setup({ initialType: 'SQL', onSaveSavedQuery });
    await userEvent.type(screen.getByLabelText('Name'), 'Queue');
    await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT COUNT(*) QTY FROM QUEUE' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save to catalog' }));
    const dialog = screen.getByRole('dialog', { name: 'Add saved query' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save query' }));
    expect(onSaveSavedQuery).toHaveBeenCalledWith(expect.objectContaining({ name: 'Queue', connectionId: 'ora', sql: 'SELECT COUNT(*) QTY FROM QUEUE' }));
  });

  it('edit mode can delete the monitor after a confirmation', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    setup({ mode: 'edit', onDelete, initialState: { ...initialFormState(), type: 'HTTP', name: 'Portal', groupId: 'pay', url: 'https://portal/health' } });
    await userEvent.click(screen.getByRole('button', { name: 'Delete monitor' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete Portal?' })).getByRole('button', { name: 'Delete monitor' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('cancel', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(p.onCancel).toHaveBeenCalled();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<MonitorForm groups={groups} connections={connections} onPreview={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('heading', { name: 'Alvo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar monitor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo: Dados' })).toBeInTheDocument();
  });
});
