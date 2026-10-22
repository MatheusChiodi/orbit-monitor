import { expect, test } from '@playwright/test';
import { goOffline } from './support/offline';

test.describe('wall in demo mode', () => {
  test.beforeEach(async ({ page }) => {
    await goOffline(page);
  });

  test('incident scenario: the hero shows the down monitor with impact, escalation and Acknowledge', async ({ page }) => {
    await page.goto('/wall.html?demo');

    await expect(page.getByText('demo data')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: '1 monitor down' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Situation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reconciliation queue', level: 3 })).toBeVisible();
    await expect(page.getByText('Probable impact')).toBeVisible();
    await expect(page.getByRole('timer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acknowledge' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Also active' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'All monitors' })).toBeVisible();
  });

  test('incident scenario: acknowledging shows when, never a name (?operator= is ignored)', async ({ page }) => {
    await page.goto('/wall.html?demo&operator=Night%20shift');

    await page.getByRole('button', { name: 'Acknowledge' }).click();

    await expect(page.getByRole('paragraph').filter({ hasText: /^Acknowledged at \d{2}:\d{2}$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acknowledge' })).toHaveCount(0);
    // the acknowledgement also lands on the timeline
    await expect(page.locator('ol').getByText(/^Acknowledged at \d{2}:\d{2}$/)).toBeVisible();
    await expect(page.getByText('Night shift')).toHaveCount(0);
  });

  test('ok scenario: the calm hero replaces the incident hero', async ({ page }) => {
    await page.goto('/wall.html?demo&scenario=ok');

    await expect(page.getByRole('status').filter({ hasText: 'All systems operational' })).toBeVisible();
    await expect(page.getByText('24 h availability')).toBeVisible();
    await expect(page.getByText('No other active problems')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acknowledge' })).toHaveCount(0);
    await expect(page.getByRole('timer')).toHaveCount(0);
  });

  test('every monitor group of the demo workspace is on the matrix', async ({ page }) => {
    await page.goto('/wall.html?demo&scenario=ok');

    for (const group of ['Payments', 'Core Banking', 'Customer Portal', 'Integrations', 'Infrastructure']) {
      await expect(page.getByRole('group', { name: group })).toBeVisible();
    }
  });

  test('on a phone (FE-49) the on-call view fits the width and keeps Acknowledge', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/wall.html?demo');

    const ack = page.getByRole('button', { name: 'Acknowledge' });
    await expect(ack).toBeVisible();
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(scroll).toBeLessThanOrEqual(0);
  });

  // Bug (frontend-agent): FE-49 asks for a 44 px Acknowledge (`min-h-[2.75rem]`), but the wall's
  // root font size shrinks on phones, so the button renders 38.5 px tall at 390 px wide.
  test.fixme('on a phone the Acknowledge touch target is at least 44 px tall', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/wall.html?demo');

    const box = await page.getByRole('button', { name: 'Acknowledge' }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('no uncaught errors while the wall runs for a few seconds', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/wall.html?demo');
    await expect(page.getByRole('heading', { name: 'Situation' })).toBeVisible();
    await page.waitForTimeout(3_000);

    expect(errors).toEqual([]);
  });
});
