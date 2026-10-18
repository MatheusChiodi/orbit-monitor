import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '@/shared/api/types';
import { SESSION_KEY, canEditMonitors, createSessionStore } from './session';

const session: Session = { token: 't1', user: { id: 'u1', name: 'Ana', role: 'editor' } };

beforeEach(() => {
  sessionStorage.clear();
});

describe('createSessionStore', () => {
  it('começa sem sessão', () => {
    expect(createSessionStore().getState().session).toBeNull();
  });

  it('signIn guarda a sessão e persiste no sessionStorage', () => {
    const store = createSessionStore();
    store.getState().signIn(session);
    expect(store.getState().session?.user.name).toBe('Ana');
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}').token).toBe('t1');
  });

  it('restaura a sessão salva', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    expect(createSessionStore().getState().session?.token).toBe('t1');
  });

  it('ignora sessão salva corrompida', () => {
    sessionStorage.setItem(SESSION_KEY, '{x');
    expect(createSessionStore().getState().session).toBeNull();
  });

  it('signOut limpa tudo', () => {
    const store = createSessionStore();
    store.getState().signIn(session);
    store.getState().signOut();
    expect(store.getState().session).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('canEditMonitors', () => {
  it('editor e admin editam; viewer e operator não', () => {
    expect(canEditMonitors('editor')).toBe(true);
    expect(canEditMonitors('admin')).toBe(true);
    expect(canEditMonitors('operator')).toBe(false);
    expect(canEditMonitors('viewer')).toBe(false);
  });
});
