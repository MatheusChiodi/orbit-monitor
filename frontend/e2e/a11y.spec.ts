import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { fakeApi, goOffline } from './support/offline';
import { DEV_URL } from './support/urls';

/** WCAG 2.1 AA plus axe best practices (docs/03-design.md: contrast, keyboard, screen readers). */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

/**
 * Known violations, each tracked by a test.fixme below. Remove the rule from this list when its
 * fixme test is turned on, so the general audits guard it from then on.
 */
const KNOWN = ['label-content-name-mismatch', 'page-has-heading-one', 'color-contrast'];

async function violations(page: Page, options: { rules?: string[]; skipKnown?: boolean } = {}) {
  let builder = new AxeBuilder({ page }).withTags(TAGS);
  if (options.rules) builder = builder.withRules(options.rules);
  if (options.skipKnown) builder = builder.disableRules(KNOWN);
  const result = await builder.analyze();
  return result.violations.map((v) => `${v.id} (${v.impact}) ${v.nodes.length}x: ${v.nodes[0]?.target.join(' ')}`);
}

async function openWall(page: Page, query = '') {
  await goOffline(page);
  await page.goto(`/wall.html?demo${query.replace('?', '&')}`);
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
}

test.describe('accessibility (axe)', () => {
  for (const query of ['', '?scenario=ok', '?lang=pt-BR']) {
    test(`wall${query || ' (incident)'} has no other violations`, async ({ page }) => {
      await openWall(page, query);
      expect(await violations(page, { skipKnown: true })).toEqual([]);
    });
  }

  test('wall on a phone (FE-49 on-call view) has no other violations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWall(page);
    expect(await violations(page, { skipKnown: true })).toEqual([]);
  });

  test('console workspace (demo) is fully clean', async ({ page }) => {
    await goOffline(page);
    await page.goto('/?demo');
    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();

    expect(await violations(page)).toEqual([]);
  });

  test('console view-only banner is announced as a status', async ({ page }) => {
    await fakeApi(page, { access: { mode: 'view-only', client: 'lan' }, groups: [], monitors: [] });
    await page.goto('/');

    await expect(page.getByRole('status').filter({ hasText: 'View-only' })).toBeVisible();
  });

  test('wall controls are reachable with the keyboard', async ({ page }) => {
    await openWall(page);

    const reached = new Set<string>();
    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press('Tab');
      reached.add(
        await page.evaluate(() => {
          const el = document.activeElement;
          return el ? (el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '') : '';
        }),
      );
    }
    expect([...reached]).toContain('Acknowledge');
  });

  // Bug (frontend-agent): SoundToggle is named "Sound alerts" by aria-labelledby while it shows
  // "Muted" / "Sound on" — WCAG 2.5.3 Label in Name; voice users saying "click Muted" fail.
  test('wall sound toggle includes its visible text in its accessible name', async ({ page }) => {
    await openWall(page);
    expect(await violations(page, { rules: ['label-content-name-mismatch'] })).toEqual([]);
  });

  // Bug (frontend-agent): the wall has h2 sections but no h1, so screen-reader users get no page title heading.
  test.fixme('wall has a level-one heading', async ({ page }) => {
    await openWall(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  // Bug (frontend-agent / orbit-themes): `--dim` (#5a6575 on #0d1117, 3.2:1) is a large-text level
  // (contrast.ts guards it at 3:1) but is used on small text: the chart axis labels (9.3 px) need
  // 4.5:1 (WCAG 1.4.3).
  test.fixme('viz gallery axis labels meet AA contrast', async ({ page }) => {
    await page.goto(`${DEV_URL}/src/shared/viz/VizGallery/gallery.html`);
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(20);
    expect(await violations(page, { rules: ['color-contrast'] })).toEqual([]);
  });
});
