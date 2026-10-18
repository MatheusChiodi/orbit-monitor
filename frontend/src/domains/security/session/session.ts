import { createStore } from 'zustand/vanilla';
import type { Role, Session } from '@/shared/api/types';

export const SESSION_KEY = 'orbit.session';

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  if (!('token' in value) || typeof value.token !== 'string') return false;
  if (!('user' in value) || !value.user || typeof value.user !== 'object') return false;
  return 'name' in value.user && typeof value.user.name === 'string';
}

function readSaved(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // armazenamento bloqueado: a sessão vale só nesta aba
  }
}

export interface SessionState {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

/** Sessão do console. O refresh token vive em cookie HttpOnly; aqui só o JWT curto. */
export function createSessionStore() {
  return createStore<SessionState>()((set) => ({
    session: readSaved(),
    signIn: (session) => {
      write(session);
      set({ session });
    },
    signOut: () => {
      write(null);
      set({ session: null });
    },
  }));
}

export type SessionStore = ReturnType<typeof createSessionStore>;

export function canEditMonitors(role: Role): boolean {
  return role === 'editor' || role === 'admin';
}
