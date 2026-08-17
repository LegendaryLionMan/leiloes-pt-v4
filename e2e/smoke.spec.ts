// Smoke E2E test for leiloes-pt v4 — verifies the critical user paths.
// Run with `npx playwright test e2e/smoke.spec.ts` from the v4 root.
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5180';

test.describe('leiloes-pt v4 smoke', () => {
  test('home page loads with KPIs', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.getByRole('heading', { name: 'Lista' })).toBeVisible();
    // KPIs render
    await expect(page.getByText('Total no scope')).toBeVisible();
    await expect(page.getByText('Poupança potencial')).toBeVisible();
  });

  test('Tavira preset filters to 2 items', async ({ page }) => {
    await page.goto(BASE + '/');
    // Wait for KPIs loaded
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);
    // Click Tavira pill
    await page.getByRole('button', { name: /Tavira.*Imóveis/ }).click();
    // Filter banner appears
    await expect(page.getByText(/filtros ativos/i)).toBeVisible();
    // The active-filter banner shows district + concelho
    await expect(page.getByText(/1 distrito\(s\).*1 concelho\(s\).*1 categoria\(s\)/)).toBeVisible();
  });

  test('top opportunities page', async ({ page }) => {
    await page.goto(BASE + '/top');
    await expect(page.getByRole('heading', { name: /Top oportunidades/ })).toBeVisible();
    await expect(page.getByText('Desconto mínimo')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Distrito' })).toBeVisible();
  });

  test('visualizations page renders all 4 chart cards', async ({ page }) => {
    await page.goto(BASE + '/visualizacoes');
    await expect(page.getByText('Por categoria (quantidade)')).toBeVisible();
    await expect(page.getByText('Por distrito (top 10)')).toBeVisible();
    await expect(page.getByText(/Publicações nos últimos 30 dias/)).toBeVisible();
    await expect(page.getByText(/Encerramentos nos próximos 30 dias/)).toBeVisible();
  });

  test('mapa page renders distrito grid', async ({ page }) => {
    await page.goto(BASE + '/mapa');
    await expect(page.getByRole('heading', { name: 'Mapa' })).toBeVisible();
    // At least one distrito name visible
    await expect(page.getByText('Lisboa')).toBeVisible();
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
    await page.waitForResponse((r) => r.url().includes('/api/leiloes') && r.status() === 200);
    expect(errors.filter((e) => !e.includes('React Router'))).toEqual([]);
  });
});
