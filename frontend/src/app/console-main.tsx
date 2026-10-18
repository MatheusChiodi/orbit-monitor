import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <main className="p-8 text-muted">Console do Orbit em construção.</main>
    </StrictMode>,
  );
}
