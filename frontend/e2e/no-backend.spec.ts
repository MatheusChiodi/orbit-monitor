import { expect, test } from '@playwright/test';
import { goOffline } from './support/offline';

/** Without a backend Orbit never invents data: everything shown comes from what the operator configured. */
test.describe('no backend, no demo', () => {
  test.beforeEach(async ({ page }) => {
    await goOffline(page);
  });

  test('the console says the server is unreachable and offers a retry', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('alert')).toContainText('Cannot reach the Orbit server');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('demo data')).toHaveCount(0);
    await expect(page.getByText('Reconciliation queue')).toHaveCount(0);
  });

  test('the wall waits for the server instead of showing demo monitors', async ({ page }) => {
    await page.goto('/wall.html');

    await expect(page.getByRole('status')).toContainText('Waiting for the Orbit server…');
    await expect(page.getByText('demo data')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'All monitors' })).toHaveCount(0);
  });
});
