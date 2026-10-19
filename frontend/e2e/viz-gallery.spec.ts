import { expect, test } from '@playwright/test';
import { DEV_URL } from './support/urls';

/** Dev-only page (FE-21, FE-24): served by the dev server, never part of the build. */
const PATH = '/src/shared/viz/VizGallery/gallery.html';
const GALLERY = `${DEV_URL}${PATH}`;

test.describe('viz gallery (dev only)', () => {
  test('renders the 20 display modes in order, each with a heading', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(GALLERY);

    const headings = page.getByRole('heading', { level: 2 });
    await expect(headings).toHaveCount(20);
    await expect(headings.first()).toHaveText(/^1 · Big number/);
    await expect(headings.last()).toHaveText(/^20 · /);
    expect(errors).toEqual([]);
  });

  test('chart modes expose a text alternative for screen readers', async ({ page }) => {
    await page.goto(GALLERY);

    await expect(page.getByRole('img', { name: /Latency: 205 ms/ })).toBeVisible();
    await expect(page.getByRole('meter', { name: 'Disk' })).toBeVisible();
  });

  test('?section=picker shows the visualization picker', async ({ page }) => {
    await page.goto(`${GALLERY}?section=picker`);

    await expect(page.getByRole('heading', { level: 2, name: /Big number/ })).toHaveCount(0);
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('the gallery is not shipped in the production build', async ({ request }) => {
    const response = await request.get(PATH);
    expect(await response.text()).not.toContain('gallery-main');
  });
});
