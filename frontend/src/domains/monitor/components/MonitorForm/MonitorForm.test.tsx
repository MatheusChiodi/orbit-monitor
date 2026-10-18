import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PreviewResult } from '@/shared/api/types';
import { MonitorForm } from './MonitorForm';

const groups = [{ id: 'pag', name: 'Pagamentos' }];
const connections = [{ id: 'ora', name: 'Oracle Core', kind: 'ORACLE' as const }];
const preview: PreviewResult = {
  columns: [{ name: 'QTD', type: 'number' }],
  rows: [{ QTD: 347 }],
  elapsedMs: 120,
};

function setup(overrides: Partial<Parameters<typeof MonitorForm>[0]> = {}) {
  const props = {
    groups,
    connections,
    onPreview: vi.fn().mockResolvedValue(preview),
    onSave: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<MonitorForm {...props} />);
  return props;
}

async function fillSql() {
  await userEvent.type(screen.getByLabelText('Nome'), 'Fila de conciliação');
  await userEvent.selectOptions(screen.getByLabelText('Grupo'), 'pag');
  await userEvent.selectOptions(screen.getByLabelText('Conexão'), 'ora');
  fireEvent.change(screen.getByRole('textbox', { name: 'Consulta SQL' }), { target: { value: 'SELECT COUNT(*) QTD FROM FILA' } });
}

describe('MonitorForm', () => {
  it('duas colunas: configuração e preview ao vivo', () => {
    setup();
    expect(screen.getByRole('region', { name: 'Configuração' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preview' })).toHaveTextContent('Execute o preview');
  });

  it('SQL: executa preview, mostra tabela e abre Dados e exibição', async () => {
    const props = setup();
    await fillSql();
    await userEvent.click(screen.getByRole('button', { name: 'Executar preview' }));
    expect(props.onPreview).toHaveBeenCalledWith({ type: 'SQL', connectionId: 'ora', sql: 'SELECT COUNT(*) QTD FROM FILA' });
    expect(await screen.findByRole('table', { name: 'Resultado do preview' })).toBeInTheDocument();
    const step = screen.getByRole('region', { name: 'Dados e exibição' });
    expect(within(step).getByRole('group', { name: 'QTD' })).toBeInTheDocument();
    expect(within(step).getByRole('group', { name: '[ROWS]' })).toBeInTheDocument();
  });

  it('condição avaliada contra o preview e salva a definição', async () => {
    const props = setup();
    await fillSql();
    await userEvent.click(screen.getByRole('button', { name: 'Executar preview' }));
    await screen.findByRole('table', { name: 'Resultado do preview' });
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar condição' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Valor' }), { target: { value: '200' } });
    expect(screen.getByText('Essa condição falharia agora (ATENÇÃO)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar monitor' }));
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fila de conciliação',
        type: 'SQL',
        conditions: [{ field: 'QTD', operator: '<', value: '200', level: 'WARN' }],
      }),
    );
  });

  it('não executa preview com SELECT inválido', async () => {
    const props = setup();
    await userEvent.selectOptions(screen.getByLabelText('Conexão'), 'ora');
    fireEvent.change(screen.getByRole('textbox', { name: 'Consulta SQL' }), { target: { value: 'DELETE FROM x' } });
    expect(screen.getByRole('button', { name: 'Executar preview' })).toBeDisabled();
    expect(props.onPreview).not.toHaveBeenCalled();
  });

  it('erro do preview aparece no painel', async () => {
    setup({ onPreview: vi.fn().mockRejectedValue(new Error('ORA-00942: tabela não existe')) });
    await fillSql();
    await userEvent.click(screen.getByRole('button', { name: 'Executar preview' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ORA-00942');
  });

  it('HTTP: troca o tipo e pede método e URL', async () => {
    const props = setup({
      onPreview: vi.fn().mockResolvedValue({ columns: [{ name: '$.status', type: 'text' }], rows: [{ '$.status': 'UP' }], elapsedMs: 80, status: 200 }),
    });
    await userEvent.click(screen.getByRole('radio', { name: 'HTTP' }));
    expect(screen.queryByRole('textbox', { name: 'Consulta SQL' })).toBeNull();
    await userEvent.type(screen.getByLabelText('URL'), 'https://portal/health');
    await userEvent.click(screen.getByRole('button', { name: 'Executar preview' }));
    expect(props.onPreview).toHaveBeenCalledWith({ type: 'HTTP', method: 'GET', url: 'https://portal/health', headers: {} });
    expect(await screen.findByText('HTTP 200')).toBeInTheDocument();
  });

  it('salvar sem campos obrigatórios mostra os erros', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar monitor' }));
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome');
  });

  it('cancelar', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onCancel).toHaveBeenCalled();
  });
});
