import type { Page } from '@playwright/test';

const isApi = (url: URL) => url.pathname.startsWith('/api/');

/** Cuts the backend; pages opened with `?demo` then show demo data, others wait for the server. */
export async function goOffline(page: Page): Promise<void> {
  await page.route(isApi, (route) => route.abort());
  await page.routeWebSocket(/\/ws\//, (socket) => socket.close());
}

/** Answers `/api/<path>` with JSON from `responses`; anything else under `/api` fails. */
export async function fakeApi(page: Page, responses: Record<string, unknown>): Promise<void> {
  await page.route(isApi, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\//, '');
    if (route.request().method() === 'GET' && path in responses) {
      return route.fulfill({ json: responses[path] });
    }
    return route.abort();
  });
  await page.routeWebSocket(/\/ws\//, (socket) => socket.close());
}

/** Skips the operator prompt by saving a name on the device, like a returning operator. */
export async function rememberOperator(page: Page, name: string): Promise<void> {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem('orbit.operator', value);
    } catch {
      // storage blocked: the prompt will show
    }
  }, name);
}
