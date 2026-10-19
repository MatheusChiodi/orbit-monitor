import { expect, test } from '@playwright/test';
import { goOffline } from './support/offline';

test.describe('console operator name (BE-45, no login)', () => {
  test.beforeEach(async ({ page }) => {
    await goOffline(page);
  });

  test('a first visit asks for a name before showing the workspace', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'What name should appear on your actions?' })).toBeVisible();
    await expect(page.getByText('It is self-declared, not a login.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Monitors' })).toHaveCount(0);
  });

  test('an empty or blank name is refused with an alert', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Operator name').fill('   ');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('alert')).toHaveText('Enter a name');
    await expect(page.getByRole('heading', { name: 'Monitors' })).toHaveCount(0);
  });

  test('a name opens the demo workspace and survives a reload', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Operator name').fill('  Ana Souza  ');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();
    await expect(page.getByText('Ana Souza', { exact: true })).toBeVisible();
    await expect(page.getByText('demo data')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();
    await expect(page.getByText('Ana Souza', { exact: true })).toBeVisible();
  });

  test('"Change name" reopens the prompt with the current name filled in', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Operator name').fill('Ana');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Change name' }).click();

    await expect(page.getByLabel('Operator name')).toHaveValue('Ana');
    await page.getByLabel('Operator name').fill('Bruno');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Bruno', { exact: true })).toBeVisible();
  });

  test('every API call carries the declared name in X-Orbit-Operator', async ({ page }) => {
    const headers: (string | undefined)[] = [];
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      (route) => {
        headers.push(route.request().headers()['x-orbit-operator']);
        return route.abort();
      },
    );
    await page.goto('/');
    await page.getByLabel('Operator name').fill('Ana');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();

    expect(headers.length).toBeGreaterThan(0);
    expect(new Set(headers)).toEqual(new Set(['Ana']));
  });
});
