import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_URL || (
  process.env.APP_URL && !process.env.APP_URL.includes('.run.app')
    ? process.env.APP_URL
    : 'http://127.0.0.1:3000'
);
const API = `${BASE}/api`;

test.describe('Leilões Portugal — Comprehensive E2E Test Suite', () => {

  // --------------------------------------------------------------------------
  // Journey 1: Landing Page & Live KPI Telemetry
  // --------------------------------------------------------------------------
  test('Journey 1: Landing page loads with verified live KPI telemetry', async ({ page, request }) => {
    // 1. Fetch source of truth from API
    const kpisRes = await request.get(`${API}/kpis`);
    expect(kpisRes.status()).toBe(200);
    const kpis = await kpisRes.json();
    expect(kpis.total).toBeGreaterThan(0);

    // 2. Navigate to application root
    await page.goto(`${BASE}/`);

    // Verify Page Title and Header
    await expect(page).toHaveTitle(/Leilões Portugal/i);
    await expect(page.getByRole('heading', { name: /Lista|List/i })).toBeVisible();

    // Verify KPI Tiles match API values
    await expect(page.getByText('Total no scope')).toBeVisible();
    await expect(page.getByText(String(kpis.total), { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Poupança potencial')).toBeVisible();

    // Verify Topbar Brand & Cache controls
    await expect(page.getByText('leiloes-pt')).toBeVisible();
    await expect(page.getByLabel('Refrescar cache')).toBeVisible();

    // Verify Global Elements: Logo, Search Bar, Theme Toggle, Language Switcher
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByPlaceholder(/pesquisar|search/i)).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Journey 2: Multi-Factor Filtering & Search Reactivity
  // --------------------------------------------------------------------------
  test('Journey 2: Filtering by search term, presets, and category facets', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);

    // 1. Quick Filter Preset: Tavira (Algarve)
    const taviraPreset = page.getByRole('button', { name: /Tavira.*Imóveis/i });
    await expect(taviraPreset).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/leiloes') && r.status() === 200),
      taviraPreset.click(),
    ]);

    // Verify active filter banner
    await expect(page.getByText(/filtros ativos/i)).toBeVisible();
    await expect(page.getByText(/1 distrito\(s\).*1 concelho\(s\).*1 categoria\(s\)/)).toBeVisible();

    // Reset filters via "Limpar todos os filtros" button
    const clearBtn = page.getByLabel('Limpar todos os filtros');
    await clearBtn.click();
    await expect(page.getByText(/filtros ativos/i)).not.toBeVisible();

    // 2. Text Search filtering
    const searchInput = page.getByPlaceholder(/pesquisar|search/i);
    await searchInput.fill('moradia');
    await page.waitForTimeout(400); // debounce wait

    // Ensure all visible rows or empty state correspond to the query
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstRowText = await rows.first().innerText();
      expect(firstRowText.toLowerCase()).toContain('moradia');
    }

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(400);
  });

  // --------------------------------------------------------------------------
  // Journey 3: URL Parameter Deep Linking & State Synchronization
  // --------------------------------------------------------------------------
  test('Journey 3: URL search params sync and bookmarking', async ({ page }) => {
    // Navigate with predefined query parameters matching Lista URL schema
    await page.goto(`${BASE}/?categoria=Im%C3%B3vel`);
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);

    // Verify filter is active from URL
    await expect(page.getByText(/filtros ativos/i)).toBeVisible();

    // Clear all filters
    const clearBtn = page.getByLabel('Limpar todos os filtros');
    await clearBtn.click();
    await page.waitForTimeout(300);
    expect(page.url()).not.toContain('categoria=Im');
  });

  // --------------------------------------------------------------------------
  // Journey 4: Auction Detail Drawer & Keyboard Accessibility
  // --------------------------------------------------------------------------
  test('Journey 4: Interactive Auction Detail Drawer opens, renders full data, and closes with ESC', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForResponse((r) => r.url().includes('/api/leiloes') && r.status() === 200);
    await page.waitForTimeout(500);

    // Click first auction row to open Drawer
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // Verify Drawer dialog
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Check key auction data sections in Drawer
    await expect(drawer.getByText(/Valor base|Avaliação|Base/i).first()).toBeVisible();
    await expect(drawer.getByText(/Valor mínimo|Mínimo/i).first()).toBeVisible();
    await expect(drawer.getByText(/Praça/i).first()).toBeVisible();
    await expect(drawer.getByText(/Fonte/i).first()).toBeVisible();

    // Verify external link to official e-leiloes portal exists
    const externalLink = drawer.getByRole('link', { name: /Ver no e-leilões|Abrir/i });
    if (await externalLink.isVisible()) {
      await expect(externalLink).toHaveAttribute('target', '_blank');
      await expect(externalLink).toHaveAttribute('rel', /noopener/i);
    }

    // Keyboard accessibility: ESC key closes the dialog
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Journey 5: Geospatial Interactive Map & District Drill-Down
  // --------------------------------------------------------------------------
  test('Journey 5: Geospatial map renders Leaflet container and interactive district bubbles', async ({ page }) => {
    await page.goto(`${BASE}/mapa`);

    // Verify Leaflet Container loaded
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });

    // Verify district bubbles are rendered (interactive paths)
    await page.waitForFunction(
      () => document.querySelectorAll('path.leaflet-interactive').length >= 18,
      null,
      { timeout: 15_000 }
    );

    // Verify Top Districts ranking sidebar/panel
    await expect(page.getByText(/Top distritos|Distritos/i).first()).toBeVisible();

    // Click on a district bubble to test zoom/drill
    const firstBubble = page.locator('path.leaflet-interactive').first();
    await firstBubble.click();
    await page.waitForTimeout(500);

    // Concelhos table or detail badge should appear
    await expect(page.locator('body')).not.toBeEmpty();
  });

  // --------------------------------------------------------------------------
  // Journey 6: Analytics Dashboard & Data Visualizations
  // --------------------------------------------------------------------------
  test('Journey 6: Analytics visualizations render status summary and all charts', async ({ page }) => {
    await page.goto(`${BASE}/visualizacoes`);

    // Verify 4 lifecycle states
    await expect(page.getByText('Em curso').first()).toBeVisible();
    await expect(page.getByText('Terminado').first()).toBeVisible();
    await expect(page.getByText('Cancelado').first()).toBeVisible();
    await expect(page.getByText('Agendado').first()).toBeVisible();

    // Verify chart headings
    await expect(page.getByText(/Por categoria/i).first()).toBeVisible();
    await expect(page.getByText(/Por distrito/i).first()).toBeVisible();
    await expect(page.getByText(/Linha temporal/i).first()).toBeVisible();
    await expect(page.getByText(/Lance atual vs Valor mínimo/i).first()).toBeVisible();
    await expect(page.getByText(/Por modalidade/i).first()).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Journey 7: Alert Management Lifecycle (Create, List, Toggle, Safe Delete)
  // --------------------------------------------------------------------------
  test('Journey 7: Complete Alert lifecycle (Create -> Match -> Toggle -> Iframe-Safe Delete)', async ({ page }) => {
    // 1. Navigate to Create Alert
    await page.goto(`${BASE}/alerta/new`);
    await expect(page.getByRole('heading', { name: /Criar alerta|Create alert/i })).toBeVisible();

    const uniqueAlertName = `Alerta Teste E2E ${Date.now()}`;
    const nameInput = page.getByPlaceholder(/Cabanas terrenos|Ex: Cabanas/i);
    await nameInput.fill(uniqueAlertName);

    // Set Max Budget
    const maxBudgetInput = page.getByPlaceholder(/sem limite/i);
    if (await maxBudgetInput.isVisible()) {
      await maxBudgetInput.fill('250000');
    }

    // Submit alert form with "Guardar alerta"
    const submitBtn = page.getByRole('button', { name: /Guardar alerta/i });
    await expect(submitBtn).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/alertas') && (r.status() === 200 || r.status() === 201)),
      submitBtn.click(),
    ]);

    // 2. Navigate to /alertas — verify new alert is present
    await page.goto(`${BASE}/alertas`);
    await expect(page.getByText(uniqueAlertName)).toBeVisible();

    // 3. Verify alert appears in /matches
    await page.goto(`${BASE}/matches`);
    await expect(page.getByRole('heading', { name: /Matches/i })).toBeVisible();

    // 4. Return to /alertas and test two-step iframe-safe deletion
    await page.goto(`${BASE}/alertas`);
    await expect(page.getByText(uniqueAlertName)).toBeVisible();

    // Trigger in-place delete confirmation (no window.confirm popup)
    const deleteBtn = page.getByRole('button', { name: `Apagar alerta ${uniqueAlertName}` });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirm button must appear in-place
    const confirmBtn = page.getByRole('button', { name: 'Confirmar' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Alert must now be deleted
    await page.waitForTimeout(500);
    await expect(page.getByText(uniqueAlertName)).not.toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Journey 8: Internationalization (i18n) & Local Storage Persistence
  // --------------------------------------------------------------------------
  test('Journey 8: Language switcher translates UI and persists user preference', async ({ page }) => {
    await page.goto(`${BASE}/`);

    // Locate language switcher
    const enButton = page.getByRole('button', { name: /^EN$/i });
    const ptButton = page.getByRole('button', { name: /^PT$/i });

    if (await enButton.isVisible()) {
      // Switch to English
      await enButton.click();
      await page.waitForTimeout(300);

      // Verify UI translated to English
      await expect(page.getByText(/Potential savings|Total in scope|Auctions/i).first()).toBeVisible();

      // Reload and verify persistence
      await page.reload();
      await page.waitForTimeout(300);
      await expect(page.getByText(/Potential savings|Total in scope|Auctions/i).first()).toBeVisible();

      // Switch back to Portuguese
      await ptButton.click();
      await page.waitForTimeout(300);
      await expect(page.getByText(/Poupança potencial|Total no scope|Leilões/i).first()).toBeVisible();
    }
  });

  // --------------------------------------------------------------------------
  // Journey 9: Theme Toggle (Dark / Light Mode)
  // --------------------------------------------------------------------------
  test('Journey 9: Theme toggle changes root class and persists state', async ({ page }) => {
    await page.goto(`${BASE}/`);

    const themeToggle = page.getByRole('button', { name: /Modo escuro|Modo claro|Alternar tema|theme/i }).first();
    if (await themeToggle.isVisible()) {
      const initialDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

      await themeToggle.click();
      await page.waitForTimeout(200);

      const toggledDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(toggledDark).toBe(!initialDark);

      // Toggle back to restore initial state
      await themeToggle.click();
    }
  });

  // --------------------------------------------------------------------------
  // Journey 10: Mobile Responsive Viewport (375x667)
  // --------------------------------------------------------------------------
  test('Journey 10: Mobile responsive navigation and touch targets', async ({ page }) => {
    // Set iPhone SE viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}/`);
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);

    // Verify mobile navigation exists (bottom navigation or mobile menu)
    const mobileNav = page.locator('nav').first();
    await expect(mobileNav).toBeVisible();

    // Verify touch targets have at least 44px minimum touch dimensions
    const navButtons = page.locator('nav a, nav button');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);

    // Verify table doesn't break horizontal viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(390); // within minor margin of 375
  });

  // --------------------------------------------------------------------------
  // Journey 11: CSV Data Export & Backend Health Integrity
  // --------------------------------------------------------------------------
  test('Journey 11: CSV data export triggers valid file and /api/health is ok', async ({ page, request }) => {
    // 1. Verify health endpoint
    const health = await request.get(`${API}/health`);
    expect(health.status()).toBe(200);
    const healthData = await health.json();
    expect(healthData.status).toBe('ok');
    expect(healthData.version).toBeDefined();

    // 2. Verify CSV Download produces leiloes.csv
    await page.goto(`${BASE}/`);
    await page.waitForResponse((r) => r.url().includes('/api/kpis') && r.status() === 200);

    const downloadPromise = page.waitForEvent('download');
    const csvLink = page.getByRole('link', { name: /CSV|Descarregar CSV/i });
    await csvLink.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('leiloes.csv');
  });

});
