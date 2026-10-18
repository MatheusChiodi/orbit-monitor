import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStore } from '@/domains/security/session';
import { ConsoleApp, type ConsoleAppProps } from './ConsoleApp';

function offlineApi(): ConsoleAppProps['api'] {
  return {
    login: vi.fn().mockRejectedValue(new Error('Servidor indisponível')),
    listGroups: vi.fn().mockRejectedValue(new Error('x')),
    listMonitors: vi.fn().mockRejectedValue(new Error('x')),
    listConnections: vi.fn().mockRejectedValue(new Error('x')),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
  };
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('ConsoleApp', () => {
  it('sem sessão mostra o login', () => {
    render(<ConsoleApp api={offlineApi()} sessionStore={createSessionStore()} />);
    expect(screen.getByRole('heading', { name: 'Entrar no Orbit' })).toBeInTheDocument();
  });

  it('login com sucesso abre a lista de monitores', async () => {
    const api = {
      ...offlineApi(),
      login: vi.fn().mockResolvedValue({ token: 't', user: { id: 'u', name: 'Ana', role: 'editor' } }),
      listGroups: vi.fn().mockResolvedValue([{ id: 'g', name: 'Portal' }]),
      listMonitors: vi.fn().mockResolvedValue([
        { id: 'm', name: 'Portal web', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: new Date().toISOString() },
      ]),
      listConnections: vi.fn().mockResolvedValue([]),
    };
    render(<ConsoleApp api={api} sessionStore={createSessionStore()} />);
    await userEvent.type(screen.getByLabelText('Usuário'), 'ana');
    await userEvent.type(screen.getByLabelText('Senha'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Portal web')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('modo demonstração: lista, novo monitor com preview e volta salvo', async () => {
    render(<ConsoleApp api={offlineApi()} sessionStore={createSessionStore()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar em modo demonstração' }));
    expect(await screen.findByText('Fila de conciliação')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Novo monitor' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Lotes atrasados');
    await userEvent.selectOptions(screen.getByLabelText('Grupo'), 'core');
    await userEvent.selectOptions(screen.getByLabelText('Conexão'), 'ora-core');
    fireEvent.change(screen.getByRole('textbox', { name: 'Consulta SQL' }), { target: { value: 'SELECT COUNT(*) FROM LOTE' } });
    await userEvent.click(screen.getByRole('button', { name: 'Executar preview' }));
    expect(await screen.findByRole('table', { name: 'Resultado do preview' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar monitor' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Monitor "Lotes atrasados" salvo');
    expect(await screen.findByText('Lotes atrasados')).toBeInTheDocument();
  });

  it('sair volta ao login', async () => {
    const store = createSessionStore();
    store.getState().signIn({ token: 'demo', user: { id: 'demo', name: 'Demonstração', role: 'admin' } });
    render(<ConsoleApp api={offlineApi()} sessionStore={store} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('heading', { name: 'Entrar no Orbit' })).toBeInTheDocument();
  });

  it('viewer não vê Novo monitor', async () => {
    const store = createSessionStore();
    store.getState().signIn({ token: 'demo', user: { id: 'v', name: 'Vera', role: 'viewer' } });
    render(<ConsoleApp api={offlineApi()} sessionStore={store} />);
    expect(await screen.findByText('Fila de conciliação')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo monitor' })).toBeNull();
  });

  it('link para a parede', () => {
    const store = createSessionStore();
    store.getState().signIn({ token: 'demo', user: { id: 'demo', name: 'D', role: 'admin' } });
    render(<ConsoleApp api={offlineApi()} sessionStore={store} />);
    expect(screen.getByRole('link', { name: 'Abrir parede' })).toHaveAttribute('href', '/wall.html');
  });
});
