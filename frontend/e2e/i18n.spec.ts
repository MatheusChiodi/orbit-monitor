import { expect, test } from '@playwright/test';
import { goOffline } from './support/offline';

test.describe('language (CORE-15)', () => {
  test.beforeEach(async ({ page }) => {
    await goOffline(page);
  });

  test('?lang=pt-BR translates the wall and sets <html lang>', async ({ page }) => {
    await page.goto('/wall.html?demo&lang=pt-BR');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { name: 'Situação' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reconhecer' })).toBeVisible();
    await expect(page.getByText('dados de demonstração')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Todos os monitores' })).toBeVisible();
  });

  test('?lang=pt-BR formats numbers with the Brazilian separators', async ({ page }) => {
    await page.goto('/wall.html?demo&lang=pt-BR');

    await expect(page.getByText('1,7%').first()).toBeVisible();
    await expect(page.getByText(/1\.840 QTY/).first()).toBeVisible();
  });

  test('an unsupported ?lang= falls back to English', async ({ page }) => {
    await page.goto('/wall.html?demo&lang=xx');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Situation' })).toBeVisible();
  });

  test('the console language selector switches live and is remembered on the device', async ({ page }) => {
    await page.goto('/?demo');

    await page.getByLabel('Language').selectOption('pt-BR');
    await expect(page.getByRole('heading', { name: 'Monitores' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Monitores' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });

  // Bug (frontend-agent, protocol with backend-agent BE-38): timeline events carry preformatted
  // English `title` / `detail` ("Reconciliation queue down", "· rule QTY < 200", "recovered",
  // "down for 6min 12s"), so the pt-BR wall mixes languages. Events need structured fields
  // (monitor, kind, value, rule, duration) formatted on the client.
  test.fixme('?lang=pt-BR translates the timeline events too', async ({ page }) => {
    await page.goto('/wall.html?demo&lang=pt-BR');

    const timeline = page.getByRole('region', { name: 'Linha do tempo' });
    await expect(timeline).toBeVisible();
    await expect(timeline).not.toContainText(' rule ');
    await expect(timeline).not.toContainText(/(down|warning|recovered|acknowledged)/);
    await expect(timeline).toContainText('regra');
  });
});
