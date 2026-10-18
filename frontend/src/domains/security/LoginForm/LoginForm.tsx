import { useId, useState, type FormEvent } from 'react';
import type { LoginRequest } from '@/shared/api/types';
import { Button } from '@/shared/ui';

export interface LoginFormProps {
  onSubmit: (credentials: LoginRequest) => Promise<void>;
  /** Entrar sem backend, com dados de demonstração. */
  onDemo?: () => void;
}

const INPUT =
  'h-[2.4rem] w-full rounded-[0.45rem] border border-line-2 bg-s2 px-[0.7rem] text-text placeholder:text-dim focus:border-info focus:outline-none';

export function LoginForm({ onSubmit, onDemo }: LoginFormProps) {
  const userId = useId();
  const passId = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Informe usuário e senha');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit({ username: username.trim(), password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-[22rem] flex-col gap-[0.9rem] rounded-[0.9rem] border border-line bg-s1 p-[1.4rem]"
    >
      <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">Entrar no Orbit</h1>
      <label htmlFor={userId} className="flex flex-col gap-[0.3rem] text-[0.85rem] text-muted">
        Usuário
        <input
          id={userId}
          className={INPUT}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label htmlFor={passId} className="flex flex-col gap-[0.3rem] text-[0.85rem] text-muted">
        Senha
        <input
          id={passId}
          type="password"
          className={INPUT}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="m-0 text-[0.85rem] text-down-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={pending} block>
        Entrar
      </Button>
      {onDemo && (
        <Button variant="ghost" onClick={onDemo} block>
          Entrar em modo demonstração
        </Button>
      )}
    </form>
  );
}
