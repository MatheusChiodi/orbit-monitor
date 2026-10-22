import { expect, test } from '@playwright/test';
import { fakeApi } from './support/offline';

const GROUPS = [{ id: 'payments', name: 'Payments' }];
const MONITORS = [
  {
    id: 'm1',
    name: 'Checkout API',
    groupId: 'payments',
    type: 'HTTP',
    status: 'OK',
    value: null,
    since: '2026-10-18T10:00:00Z',
  },
];

test.describe('console view-only mode (BE-44)', () => {
  test('a LAN client sees the banner and no editing controls', async ({ page }) => {
    await fakeApi(page, {
      access: { mode: 'view-only', client: 'lan' },
      groups: GROUPS,
      monitors: MONITORS,
    });
    await page.goto('/');

    await expect(page.getByRole('status').filter({ hasText: 'View-only' })).toBeVisible();
    await expect(page.getByText('Checkout API')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New monitor' })).toHaveCount(0);
    await expect(page.getByText('demo data')).toHaveCount(0);
  });

  test('a loopback client can edit: no banner, New monitor is offered', async ({ page }) => {
    await fakeApi(page, {
      access: { mode: 'edit', client: 'loopback' },
      groups: GROUPS,
      monitors: MONITORS,
    });
    await page.goto('/');

    await expect(page.getByText('Checkout API')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New monitor' }).first()).toBeVisible();
    await expect(page.getByText(/View-only/)).toHaveCount(0);
  });
});
