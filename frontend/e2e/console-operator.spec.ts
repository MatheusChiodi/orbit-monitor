import { expect, test } from '@playwright/test';
import { goOffline } from './support/offline';

/** BE-45 retired in the UI: no login and no self-declared name; the server records the client kind. */
test.describe('console without an operator name (no login)', () => {
  test('the demo workspace opens straight away: no name prompt, no "Change name"', async ({ page }) => {
    await goOffline(page);
    await page.goto('/?demo');

    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();
    await expect(page.getByText('demo data')).toBeVisible();
    await expect(page.getByLabel('Operator name')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'What name should appear on your actions?' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Change name' })).toHaveCount(0);
  });

  test('a name left by an older version is forgotten on boot and never shown', async ({ page }) => {
    await goOffline(page);
    await page.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem('orbit.operator', 'Ana Souza');
          sessionStorage.setItem('seeded', '1');
        }
      } catch {
        // storage blocked: nothing to seed
      }
    });
    await page.goto('/?demo');

    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();
    await expect(page.getByText('Ana Souza')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('orbit.operator'))).toBeNull();
  });

  test('no API call carries X-Orbit-Operator, and the console reaches the access check without a prompt', async ({ page }) => {
    const calls: { path: string; operator: string | undefined }[] = [];
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      (route) => {
        calls.push({ path: new URL(route.request().url()).pathname, operator: route.request().headers()['x-orbit-operator'] });
        return route.abort();
      },
    );
    await page.routeWebSocket(/\/ws\//, (socket) => socket.close());
    await page.goto('/');

    await expect(page.getByRole('alert')).toContainText('Cannot reach the Orbit server');
    expect(calls.map((c) => c.path)).toContain('/api/access');
    expect(calls.filter((c) => c.operator !== undefined)).toEqual([]);
  });

  test('the wall sends no X-Orbit-Operator either', async ({ page }) => {
    const operators: (string | undefined)[] = [];
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      (route) => {
        operators.push(route.request().headers()['x-orbit-operator']);
        return route.abort();
      },
    );
    await page.routeWebSocket(/\/ws\//, (socket) => socket.close());
    await page.goto('/wall.html?operator=Night%20shift');

    await expect.poll(() => operators.length).toBeGreaterThan(0);
    expect(operators.filter((o) => o !== undefined)).toEqual([]);
  });
});
