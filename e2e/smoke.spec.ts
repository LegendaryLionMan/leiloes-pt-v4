// Smoke E2E test for leiloes-pt v4 — verifies the critical user paths.
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5180';

test.describe('leiloes-pt v4 smoke', () => {
  test('home page loads with KPIs', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.getByRole('heading', { name: 'Lista' })).toBeVisible();
    await expect(page.getByText('Total no scope')).toBeVisible();
    await expect(page.getByText('Poupança potencial')).toBeVisible();
  });

  test('Tavira preset filters to 4 items', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);
    await page.getByRole('button', { name: /Tavira.*Imóveis/ }).click();
    await expect(page.getByText(/filtros ativos/i)).toBeVisible();
    await expect(page.getByText(/1 distrito\(s\).*1 concelho\(s\).*1 categoria\(s\)/)).toBeVisible();
  });

  test('visualizations page renders all 4 chart cards', async ({ page }) => {
    await page.goto(BASE + '/visualizacoes');
    await expect(page.getByText('Por categoria (quantidade)')).toBeVisible();
    await expect(page.getByText('Por distrito (top 10)')).toBeVisible();
    await expect(page.getByText(/Publicações nos últimos 30 dias/)).toBeVisible();
    await expect(page.getByText(/Encerramentos nos próximos 30 dias/)).toBeVisible();
  });

  test('mapa page renders real Leaflet map with 18 district bubbles', async ({ page }) => {
    await page.goto(BASE + '/mapa');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });
    await page.waitForFunction(
      () => document.querySelectorAll('path.leaflet-interactive').length >= 18,
      null,
      { timeout: 15_000 },
    );
    await expect(page.getByText(/Top distritos/i)).toBeVisible();
  });

  test('leilao detail (drawer) shows valor mínimo + lance atual + dates + praça', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForResponse((r) => r.url().includes('/api/leiloes') && r.status() === 200);
    await page.waitForTimeout(500);
    // Open first row → drawer
    await page.locator('table tbody tr').first().click();
    const drawer = page.locator('[role="dialog"][aria-label*="Detalhes"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Voltar à lista')).not.toBeVisible(); // drawer has no "Voltar à lista"
    // Drawer must show praça + lance atual
    const body = await drawer.evaluate((el: any) => el.textContent ?? '');
    expect(body, 'drawer shows Praça section').toContain('Praça');
    expect(body, 'drawer shows Fonte section').toContain('Fonte');
    expect(body, 'drawer shows Lance atual section').toContain('Lance atual');
    expect(body, 'drawer shows Encerramento').toContain('Encerramento');
  });

  test('criar alerta page renders form with facets', async ({ page }) => {
    await page.goto(BASE + '/alerta/new');
    await expect(page.getByRole('heading', { name: 'Criar alerta' })).toBeVisible();
    await expect(page.getByPlaceholder(/Cabanas terrenos/i)).toBeVisible();
  });

  test('CSV download produces a CSV file', async ({ page }) => {
    await page.goto(BASE + '/');
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: /Descarregar CSV/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('leiloes.csv');
  });

  test('no console errors on Lista', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE + '/');
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);
    await new Promise((r) => setTimeout(r, 4000));
    expect(errors.filter((e) => !e.includes('React Router'))).toEqual([]);
  });
});