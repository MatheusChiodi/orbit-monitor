import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (docs/03-design.md). No backend is started: every spec cuts `/api` and `/ws`,
 * so the wall and the console run in demo mode, or the spec answers `/api` itself.
 * Two servers: a production preview (the default, also used by the performance budgets) and
 * the dev server, only for dev-only pages such as the viz gallery.
 */
const DEV_PORT = 5287;
const PREVIEW_PORT = 5288;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // The production preview is a snapshot: other work on the tree cannot hot-reload a page mid-test.
    baseURL: `http://localhost:${PREVIEW_PORT}`,
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${DEV_PORT} --strictPort`,
      url: `http://localhost:${DEV_PORT}/wall.html`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite build --outDir e2e/.dist --emptyOutDir && npx vite preview --outDir e2e/.dist --port ${PREVIEW_PORT} --strictPort`,
      url: `http://localhost:${PREVIEW_PORT}/wall.html`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
