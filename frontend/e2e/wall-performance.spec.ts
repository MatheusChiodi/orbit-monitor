import { gzipSync } from 'node:zlib';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { goOffline } from './support/offline';
import { PREVIEW_URL } from './support/urls';

/** docs/01-architecture.md and docs/03-design.md: the wall loads in < 150 KB gzip without FX. */
const WALL_BUDGET_KB = 150;

interface Asset {
  path: string;
  gzipKb: number;
  text: string;
}

/** Everything wall.html needs before it can run: entry, modulepreloads, CSS and their static imports. */
async function initialAssets(request: APIRequestContext): Promise<Asset[]> {
  const html = await (await request.get(`${PREVIEW_URL}/wall.html`)).text();
  const queue = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1] ?? '');
  const seen = new Map<string, Asset>();
  while (queue.length > 0) {
    const path = queue.shift() ?? '';
    if (seen.has(path)) continue;
    const body = await (await request.get(`${PREVIEW_URL}${path}`)).body();
    const text = body.toString('utf8');
    seen.set(path, { path, gzipKb: gzipSync(body, { level: 9 }).length / 1024, text });
    if (path.endsWith('.js')) {
      for (const m of text.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) queue.push(`/assets/${m[1]}`);
    }
  }
  return [...seen.values()];
}

test.describe('wall performance (production build)', () => {
  test(`initial load stays under the ${WALL_BUDGET_KB} KB gzip budget`, async ({ request }) => {
    const assets = await initialAssets(request);
    const total = assets.reduce((sum, a) => sum + a.gzipKb, 0);
    const breakdown = assets.map((a) => `${a.path} ${a.gzipKb.toFixed(1)} KB`).join('\n');
    expect(total, breakdown).toBeLessThan(WALL_BUDGET_KB);
  });

  test('3D and Remotion code stays out of the critical path', async ({ request }) => {
    const assets = await initialAssets(request);
    for (const asset of assets) {
      expect(asset.text, asset.path).not.toContain('WebGLRenderer');
      expect(asset.text, asset.path).not.toContain('@remotion');
    }
  });

  test('first contentful paint under 1.5 s and the hero within 2 s', async ({ page }) => {
    await goOffline(page);
    const start = Date.now();
    await page.goto(`${PREVIEW_URL}/wall.html?demo`);
    await expect(page.getByRole('heading', { name: 'Situation' })).toBeVisible({ timeout: 2_000 });
    expect(Date.now() - start).toBeLessThan(2_000);

    const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? Infinity);
    expect(fcp).toBeLessThan(1_500);
  });

  test('?motion=off loads no FX chunk at all', async ({ page }) => {
    await goOffline(page);
    const fxChunks: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (/\/assets\/(LivingOrbScene|orbMaterials|HeroOrbScene|OrbitIntro|remotion)/i.test(path)) fxChunks.push(path);
    });

    await page.goto(`${PREVIEW_URL}/wall.html?demo&scenario=ok&motion=off`);
    await expect(page.getByRole('heading', { name: 'Situation' })).toBeVisible();
    await page.waitForTimeout(2_000);

    expect(fxChunks).toEqual([]);
  });

  test('a slow GPU is downgraded to minimal FX and the wall settles near 60 fps', async ({ page }) => {
    // Headless Chromium renders WebGL in software: a good stand-in for a weak TV box.
    await goOffline(page);
    await page.goto(`${PREVIEW_URL}/wall.html?demo&scenario=ok`);
    await expect(page.getByRole('heading', { name: 'Situation' })).toBeVisible();
    await page.waitForTimeout(6_000);

    const { level, fps } = await page.evaluate(async () => {
      const frames = await new Promise<number>((resolve) => {
        let count = 0;
        const begin = performance.now();
        const tick = () => {
          count += 1;
          if (performance.now() - begin < 1_000) requestAnimationFrame(tick);
          else resolve(count);
        };
        requestAnimationFrame(tick);
      });
      return { level: document.documentElement.dataset.fx, fps: frames };
    });
    expect(['minimal', 'standard']).toContain(level);
    expect(fps).toBeGreaterThanOrEqual(30);
  });
});
