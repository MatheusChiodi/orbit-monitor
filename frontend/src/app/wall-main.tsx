import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WallApp, operatorName } from '@/domains/wall/WallApp';
import { mockSnapshot } from '@/domains/wall/mock';
import { createApiClient } from '@/shared/api/client';
import './theme.css';

const params = new URLSearchParams(window.location.search);
const token = params.get('token') ?? undefined;
const scenario = params.get('cenario') === 'ok' ? 'ok' : 'incident';
const OPERATOR_KEY = 'orbit.operator';

function savedOperator(): string | null {
  try {
    return localStorage.getItem(OPERATOR_KEY);
  } catch {
    return null;
  }
}

const operator = operatorName(window.location.search, savedOperator());
try {
  localStorage.setItem(OPERATOR_KEY, operator);
} catch {
  // armazenamento bloqueado: segue sem lembrar o nome
}

const api = createApiClient({ getToken: () => token ?? null });
const mock = () => mockSnapshot(scenario);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <WallApp api={api} operator={operator} mock={mock} token={token} />
    </StrictMode>,
  );
}
