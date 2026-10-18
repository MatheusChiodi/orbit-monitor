import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createSessionStore } from '@/domains/security/session';
import { MotionProvider } from '@/shared/motion';
import { createApiClient } from '@/shared/api/client';
import { ConsoleApp } from './console';
import './theme.css';

const sessionStore = createSessionStore();
const api = createApiClient({ getToken: () => sessionStore.getState().session?.token ?? null });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <MotionProvider>
        <ConsoleApp api={api} sessionStore={sessionStore} />
      </MotionProvider>
    </StrictMode>,
  );
}
