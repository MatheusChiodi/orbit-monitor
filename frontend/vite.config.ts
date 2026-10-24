/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { testFiles } from './testFiles';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/status': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  build: {
    rollupOptions: {
      input: {
        console: resolve(__dirname, 'index.html'),
        wall: resolve(__dirname, 'wall.html'),
      },
      output: {
        // One runtime chunk for the libraries every page needs: fewer, larger files gzip better
        // and keep the wall's first load inside its budget (docs/03-design.md §5).
        codeSplitting: {
          groups: [{ name: 'runtime', test: /node_modules[\\/](react|react-dom|scheduler|i18next|react-i18next|zustand|use-sync-external-store)[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    ...testFiles(mode),
  },
}));
