import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PreviewResult } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { MonitorForm } from './MonitorForm';

const groups = [{ id: 'pay', name: 'Payments' }];
const connections = [{ id: 'ora', name: 'Core Oracle', kind: 'ORACLE' as const }];
const preview: PreviewResult = {
  columns: [{ name: 'QTY', type: 'number' }],
  rows: [{ QTY: 347 }],
  elapsedMs: 120,
};

function props(overrides: Partial<Parameters<typeof MonitorForm>[0]> = {}) {
  return {
    groups,
    connections,
    onPreview: vi.fn().mockResolvedValue(preview),
    onSave: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
}

function setup(overrides: Partial<Parameters<typeof MonitorForm>[0]> = {}) {
  const p = props(overrides);
  render(<MonitorForm {...p} />);
  return p;
}

async function fillSql() {
  await userEvent.type(screen.getByLabelText('Name'), 'Reconciliation queue');
  await userEvent.selectOptions(screen.getByLabelText('Group'), 'pay');
  await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
  fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT COUNT(*) QTY FROM QUEUE' } });
}

describe('MonitorForm', () => {
  it('two columns: configuration and live preview', () => {
    setup();
    expect(screen.getByRole('region', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preview' })).toHaveTextContent('Run the preview');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<MonitorForm {...props()} />, 'pt-BR');
    expect(screen.getByRole('region', { name: 'Configuração' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Conexão')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Executar preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar monitor' })).toBeInTheDocument();
  });

  it('SQL: runs the preview, shows the table and opens Data & display', async () => {
    const p = setup();
    await fillSql();
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(p.onPreview).toHaveBeenCalledWith({ type: 'SQL', connectionId: 'ora', sql: 'SELECT COUNT(*) QTY FROM QUEUE', intervalSeconds: 60 });
    expect(await screen.findByRole('table', { name: 'Preview result' })).toBeInTheDocument();
    const step = screen.getByRole('region', { name: 'Data & display' });
    expect(within(step).getByRole('group', { name: 'QTY' })).toBeInTheDocument();
    expect(within(step).getByRole('group', { name: '[ROWS]' })).toBeInTheDocument();
  });

  it('a condition is evaluated against the preview and the definition is saved', async () => {
    const p = setup();
    await fillSql();
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    await screen.findByRole('table', { name: 'Preview result' });
    await userEvent.click(screen.getByRole('button', { name: 'Add condition' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Value' }), { target: { value: '200' } });
    expect(screen.getByText('This condition would fail now (WARNING)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save monitor' }));
    expect(p.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Reconciliation queue',
        type: 'SQL',
        conditions: [{ field: 'QTY', operator: '<', value: '200', level: 'WARN' }],
      }),
    );
  });

  it('does not run the preview with an invalid SELECT', async () => {
    const p = setup();
    await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'DELETE FROM x' } });
    expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    expect(p.onPreview).not.toHaveBeenCalled();
  });

  it('a preview error shows in the panel', async () => {
    setup({ onPreview: vi.fn().mockRejectedValue(new Error('ORA-00942: table or view does not exist')) });
    await fillSql();
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ORA-00942');
  });

  it('HTTP: switches the type and asks for method and URL', async () => {
    const p = setup({
      onPreview: vi.fn().mockResolvedValue({ columns: [{ name: '$.status', type: 'text' }], rows: [{ '$.status': 'UP' }], elapsedMs: 80, status: 200 }),
    });
    await userEvent.click(screen.getByRole('radio', { name: 'HTTP' }));
    expect(screen.queryByRole('textbox', { name: 'SQL query' })).toBeNull();
    await userEvent.type(screen.getByLabelText('URL'), 'https://portal/health');
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(p.onPreview).toHaveBeenCalledWith({ type: 'HTTP', method: 'GET', url: 'https://portal/health', headers: {} });
    expect(await screen.findByText('HTTP 200')).toBeInTheDocument();
  });

  it('saving without required fields shows the errors', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Save monitor' }));
    expect(p.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the name');
  });

  it('cancel', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(p.onCancel).toHaveBeenCalled();
  });
});
