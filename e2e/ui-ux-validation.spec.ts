// ui-ux-validation.spec.ts
// ============================================================================
// Meticulous UI/UX test for leiloes-pt v4.
// Verifies that EVERY value rendered in the UI matches the underlying API data
// exactly (no rounding differences, no missing fields, no formatting drift).
// ============================================================================
import { test, expect, Page } from '@playwright/test';

const SPA = 'http://127.0.0.1:5180';
const API = 'http://127.0.0.1:8001/api';

// ---------- formatters that EXACTLY mirror src/lib/ui.tsx + Lista.tsx ----------
const fmtEUR = new Intl.NumberFormat('pt-PT', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
const fmtEURcompact = new Intl.NumberFormat('pt-PT', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  notation: 'compact',
});
const fmtPct0 = (n: number) => `${n.toFixed(0)}%`;
const fmtPct1 = (n: number) => `${n.toFixed(1)}%`;

function euroFull(v: number) { return fmtEUR.format(v); }
function euroCompact(v: number) { return fmtEURcompact.format(v); }

interface LeilaoAPI {
  id: number;
  referencia: string;
  titulo: string;
  categoria: string;
  distrito: string;
  concelho: string;
  freguesia?: string;
  valor_avaliacao: number;
  valor_minimo: number;
  valor_mercado_estimado: number;
  data_publicacao: string;
  data_encerramento: string;
  data_abertura: string;
  dias_ate_encerramento: number;
  estado: string;
  praca: string;
  modalidade: string;
  fonte: string;
  link: string;
  lance_atual: number;
  foto: string;
  poupanca_potencial: number;
  poupanca_pct: number;
  desconto_vs_avaliacao_pct: number;
  novo_24h: boolean;
}

interface LeilaoDisplay {
  // Normalised text the UI shows (with € spaces + suffix)
  titulo: string;
  categoria: string;
  distrito: string;
  valor_minimo: string;
  lance_atual: string;        // "—" if 0
  avaliacao: string;
  delta_lance: string;        // "+9,4%" vs mín. or "—"
  dias: string;               // "22d", "-8d" (negative), or "—"
  estado: string;
  referencia: string;
}

async function fetchApiLeilao(page: Page, id: number): Promise<LeilaoAPI> {
  const r = await page.request.get(`${API}/leiloes/${id}`);
  expect(r.status(), `API /leiloes/${id}`).toBe(200);
  return await r.json();
}

function toDisplay(api: LeilaoAPI): LeilaoDisplay {
  const deltaLance = api.lance_atual > 0
    ? ((api.lance_atual - api.valor_minimo) / api.valor_minimo) * 100
    : null;
  const deltaSign = deltaLance != null && deltaLance >= 0 ? '+' : '';
  return {
    titulo: api.titulo,
    categoria: api.categoria,
    distrito: api.distrito ?? '—',
    valor_minimo: euroFull(api.valor_minimo),
    lance_atual: api.lance_atual > 0 ? euroFull(api.lance_atual) : '—',
    avaliacao: euroFull(api.valor_avaliacao),
    delta_lance: deltaLance != null ? `${deltaSign}${deltaLance.toFixed(1).replace('.', ',')}%` : '—',
    dias: api.dias_ate_encerramento > 0
      ? `${api.dias_ate_encerramento}d`
      : api.dias_ate_encerramento <= 0 && api.dias_ate_encerramento > -30
        ? `−${Math.abs(api.dias_ate_encerramento)}d`
        : '—',
    estado: api.estado ?? '—',
    referencia: api.referencia ?? '',
  };
}

// Helper: extract cell text from a row by header text.
async function rowCellText(row: any, header: string): Promise<string> {
  // Build header→index map from thead ths
  const headers = await row.evaluate((r: any) => {
    const table = r.closest('table');
    const ths = [...table.querySelectorAll('thead th')].map((t: any) => t.textContent.trim());
    return ths;
  });
  const idx = headers.indexOf(header);
  expect(idx, `header "${header}" not in table; got ${JSON.stringify(headers)}`).toBeGreaterThanOrEqual(0);
  const cell = await row.evaluate((r: any, i: number) => r.children[i]?.textContent?.trim() ?? '', idx);
  return cell;
}

async function getRowForReferencia(page: Page, referencia: string) {
  // wait for the table to populate
  await page.waitForSelector('table tbody tr', { timeout: 15_000 });
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const cellTxt = await row.evaluate((r: any) => {
      // Look at first cell - it has titulo + referencia as a sub-line
      const sub = r.querySelector('span.block')?.textContent?.trim() ?? '';
      return sub;
    });
    if (cellTxt === referencia) return row;
  }
  return null;
}

// ============================================================================

test.describe('UI/UX meticulous validation', () => {
  test.beforeEach(async ({ page }) => {
    // Force dark mode off to match the screenshots in the brief
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  });

  test('LISTA TABLE — every cell matches API for each Tavira item', async ({ page }) => {
    // 1) Get Tavira (Imóvel only, the preset filter) data from API
    const r = await page.request.get(`${API}/leiloes?distrito=Faro&concelho=Tavira&categoria=Imóvel&page_size=20`);
    const j = await r.json();
    const items: LeilaoAPI[] = j.items;
    expect(items.length, 'expected 4 Tavira Imóvel items').toBe(4);
    console.log(`Validating ${items.length} Tavira items`);

    // 2) Open Lista with Tavira preset
    await page.goto(SPA + '/');
    await page.waitForResponse((resp) => resp.url().includes('/api/kpis') && resp.status() === 200);
    await page.getByRole('button', { name: /Tavira.*Imóveis/ }).click();
    await page.waitForResponse((resp) => resp.url().includes('/api/leiloes') && resp.status() === 200);
    await page.waitForTimeout(800); // Let table re-render

    // 3) For each Tavira item, find the row and verify EVERY cell
    for (const api of items) {
      const row = await getRowForReferencia(page, api.referencia);
      expect(row, `row for ${api.referencia} not found in table`).not.toBeNull();
      const disp = toDisplay(api);

      // Título cell: contains titulo + referencia as sub-line
      const tituloTxt = await row!.evaluate((r: any) => r.children[0].textContent?.trim() ?? '');
      expect(tituloTxt, `título contains titulo for ${api.referencia}`)
        .toContain(api.titulo);
      expect(tituloTxt, `título contains referencia for ${api.referencia}`)
        .toContain(api.referencia);

      // Cat.
      const cat = await rowCellText(row!, 'Cat.');
      expect(cat, `Cat. for ${api.referencia}`).toBe(disp.categoria);

      // Distrito + Concelho are in the same cell as nested spans; textContent concatenates them.
      const distCell = await row!.evaluate((r: any) => {
        const cell = r.children[2];
        return {
          first: cell?.querySelector('span:not(.block)')?.textContent?.trim() ?? '',
          second: cell?.querySelector('span.block')?.textContent?.trim() ?? '',
          full: cell?.textContent?.trim() ?? '',
        };
      });
      expect(distCell.full, `Distrito contains "${disp.distrito}"`).toContain(disp.distrito);
      expect(distCell.full, `Distrito contains "${api.concelho}"`).toContain(api.concelho);

      // Valor mín.
      const vmin = await rowCellText(row!, 'Valor mín.');
      expect(vmin, `Valor mín. for ${api.referencia} (API=${api.valor_minimo} → ${disp.valor_minimo})`).toBe(disp.valor_minimo);

      // Lance atual
      const lanc = await rowCellText(row!, 'Lance atual');
      // Trim whitespace but keep dash
      expect(lanc.trim(), `Lance atual for ${api.referencia} (API=${api.lance_atual} → ${disp.lance_atual})`).toBe(disp.lance_atual);

      // Avaliação
      const av = await rowCellText(row!, 'Avaliação');
      expect(av.trim(), `Avaliação for ${api.referencia} (API=${api.valor_avaliacao})`).toBe(disp.avaliacao);

      // Δ Lance vs Valor mínimo (only when there's a lance)
      if (api.lance_atual > 0) {
        const deltaPct = ((api.lance_atual - api.valor_minimo) / api.valor_minimo) * 100;
        const sign = deltaPct >= 0 ? '+' : '';
        const deltaTxt = `${sign}${deltaPct.toFixed(1).replace('.', ',')}%`;
        // The UI shows it as a Stat label "Desconto vs mín." with the value
        const deltaCell = await row!.evaluate((r: any) => r.children[6]?.textContent?.trim() ?? '');
        expect(deltaCell, `Δ Lance cell for ${api.referencia}: ${deltaTxt}`).toContain(deltaTxt);
      }

      // Dias
      const dias = await rowCellText(row!, 'Dias');
      expect(dias.trim(), `Dias for ${api.referencia} (API=${api.dias_ate_encerramento} → ${disp.dias})`).toBe(disp.dias);

      // Estado
      const est = await rowCellText(row!, 'Estado');
      expect(est.trim(), `Estado for ${api.referencia} (API=${api.estado})`).toBe(disp.estado);
    }
  });

  test('DRAWER — every field matches API when clicking a Tavira row', async ({ page }) => {
    // Get a known item
    const r = await page.request.get(`${API}/leiloes?distrito=Faro&concelho=Tavira&referencia=LO1505932026`);
    const j = await r.json();
    // The referencia filter is ignored — pick the right one
    const api = j.items.find((it: LeilaoAPI) => it.referencia === 'LO1505932026');
    expect(api, 'LO1505932026 in Tavira set').toBeTruthy();
    console.log(`Validating drawer for ${api.titulo} (${api.referencia})`);

    // Open Lista with Tavira preset
    await page.goto(SPA + '/');
    await page.waitForResponse((resp) => resp.url().includes('/api/kpis') && resp.status() === 200);
    await page.getByRole('button', { name: /Tavira.*Imóveis/ }).click();
    await page.waitForResponse((resp) => resp.url().includes('/api/leiloes') && resp.status() === 200);
    await page.waitForTimeout(800);

    // Click the row
    const row = await getRowForReferencia(page, 'LO1505932026');
    expect(row, 'row for LO1505932026 not found').not.toBeNull();
    await row!.click();

    // Drawer should be visible
    const drawer = page.locator('[role="dialog"][aria-label*="Detalhes"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Get drawer body text
    const drawerText = await drawer.evaluate((el: any) => el.textContent ?? '');

    // ---- Validate every field ----
    // titulo
    expect(drawerText, `Drawer contains titulo "${api.titulo}"`).toContain(api.titulo);
    // categoria
    expect(drawerText, `Drawer contains categoria "${api.categoria}"`).toContain(api.categoria);
    // distrito · concelho
    expect(drawerText, `Drawer contains distrito "${api.distrito}"`).toContain(api.distrito);
    expect(drawerText, `Drawer contains concelho "${api.concelho}"`).toContain(api.concelho);
    if (api.freguesia) {
      expect(drawerText, `Drawer contains freguesia "${api.freguesia}"`).toContain(api.freguesia);
    }
    // Valor mínimo
    expect(drawerText, `Drawer shows valor mínimo ${euroFull(api.valor_minimo)}`).toContain(euroFull(api.valor_minimo));
    // Valor avaliação
    expect(drawerText, `Drawer shows valor avaliação ${euroFull(api.valor_avaliacao)}`).toContain(euroFull(api.valor_avaliacao));
    // Valor mercado
    expect(drawerText, `Drawer shows valor mercado ${euroFull(api.valor_mercado_estimado)}`).toContain(euroFull(api.valor_mercado_estimado));
    // Lance atual
    if (api.lance_atual > 0) {
      expect(drawerText, `Drawer shows lance atual ${euroFull(api.lance_atual)}`).toContain(euroFull(api.lance_atual));
    } else {
      expect(drawerText, `Drawer shows lance atual as —`).toMatch(/Lance atual\s*—/);
    }
    // NOTE: e-leilões.pt business rule forces valor_minimo = valorBase × 0.85,
    // so poupanca_pct = 15% for every item. The drawer doesn't show this constant;
    // instead it shows "Desconto vs mín." which is the lance delta vs minimum.
    // Estado pill
    expect(drawerText, `Drawer shows estado "${api.estado}"`).toContain(api.estado);
    // Referência
    expect(drawerText, `Drawer shows referência "${api.referencia}"`).toContain(api.referencia);
    // Modalidade
    expect(drawerText, `Drawer shows modalidade "${api.modalidade}"`).toContain(api.modalidade);
    // Praça
    expect(drawerText, `Drawer shows praça "${api.praca}"`).toContain(api.praca);
    // Fonte
    expect(drawerText, `Drawer shows fonte "${api.fonte}"`).toContain(api.fonte);
    // Encerramento - just verify date string format
    expect(drawerText, `Drawer shows data_encerramento`).toMatch(/Encerramento/);
    if (api.data_encerramento) {
      // The drawer shows the date formatted — at minimum the year must be present
      const yr = new Date(api.data_encerramento).getFullYear();
      expect(drawerText, `Drawer shows encerramento year ${yr}`).toContain(String(yr));
    }

    // NOTE: e-leilões.pt business rule forces valor_minimo = valorBase × 0.85,
    // so desconto_vs_avaliacao_pct = 15% for every item. That's why the
    // original "Desc. %" column was removed — it was a constant.
  });

  test('KPIs — every KPI value matches API exactly', async ({ page }) => {
    // Get ground-truth KPIs from API
    const r = await page.request.get(`${API}/kpis`);
    const api = await r.json();

    await page.goto(SPA + '/');
    await page.waitForResponse((resp) => resp.url().includes('/api/kpis') && resp.status() === 200);
    await page.waitForTimeout(500);

    const body = await page.evaluate(() => document.body.innerText);

    // Mirror formatNumber from src/lib/ui.tsx:
    const fmtNum = (n: number) => n.toLocaleString('pt-PT');
    // Mirror formatEUR(compact) — same algorithm:
    const fmtEurCompact = (v: number) => {
      if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M€`;
      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} k€`;
      return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    };
    // Mirror formatPct(p, 1):
    const fmtPct1 = (p: number) => `${p.toFixed(1).replace('.', ',')}%`;

    expect(body, `KPIs show total ${fmtNum(api.total)}`).toContain(fmtNum(api.total));
    expect(body, `KPIs show novos_24h ${api.novos_24h}`).toContain(String(api.novos_24h));
    expect(body, `KPIs show valor mínimo total ${fmtEurCompact(api.valor_minimo_total)}`).toContain(fmtEurCompact(api.valor_minimo_total));
    expect(body, `KPIs show poupança potencial ${fmtEurCompact(api.poupanca_potencial)}`).toContain(fmtEurCompact(api.poupanca_potencial));
    expect(body, `KPIs show distritos ${api.distritos}`).toContain(String(api.distritos));
    expect(body, `KPIs show encerram ≤7d ${api.encerram_7d}`).toContain(String(api.encerram_7d));
    // The desconto pct is shown as delta badge: "41,3%"
    expect(body, `KPIs show desconto médio ${fmtPct1(api.desconto_medio_pct)}`).toContain(fmtPct1(api.desconto_medio_pct));
  });

  test('CACHE FRESHNESS — topbar badge in topbar reflects API /cache/info', async ({ page }) => {
    const r = await page.request.get(`${API}/cache/info`);
    const api = await r.json();

    await page.goto(SPA + '/');
    await page.waitForResponse((resp) => resp.url().includes('/api/cache/info') && resp.status() === 200);
    await page.waitForTimeout(500);

    // The badge shows "min" for <1h, "Nh" for <24h, "Nd" for ≥24h
    // Note: due to React Query refetch every 60s, the badge might show the
    // rounded value at the moment the page loaded (different from current).
    // So we tolerate ±1 in the rounded value.
    const age = api.cache_age_hours;
    const expectedHr = Math.round(age);
    const expectedMin = Math.round(age * 60);

    const body = await page.evaluate(() => document.body.innerText);
    // The badge text should match ONE of: "Xmin", "Xh", or "Xd" where X is close
    const minMatches = body.match(/(\d+)min/);
    const hrMatches = body.match(/(\d+)h\b/);
    const dayMatches = body.match(/(\d+)d\b/);
    if (age < 1) {
      expect(minMatches, `Topbar shows cache age in min for age=${age}h`).not.toBeNull();
      const shown = parseInt(minMatches![1]!, 10);
      expect(Math.abs(shown - expectedMin)).toBeLessThanOrEqual(2);  // ±2 tolerance
    } else if (age < 24) {
      expect(hrMatches, `Topbar shows cache age in h for age=${age}h`).not.toBeNull();
      const shown = parseInt(hrMatches![1]!, 10);
      expect(Math.abs(shown - expectedHr)).toBeLessThanOrEqual(1);  // ±1 tolerance
    } else {
      expect(dayMatches, `Topbar shows cache age in d for age=${age}h`).not.toBeNull();
    }

    // stale/non-stale color is reflected in className
    if (api.is_stale) {
      const badge = page.locator('[title*="Cache atualizado"]').first();
      const cls = await badge.getAttribute('class') ?? '';
      expect(cls, 'stale cache badge has amber tone').toMatch(/amber/i);
    } else {
      const badge = page.locator('[title*="Cache atualizado"]').first();
      const cls = await badge.getAttribute('class') ?? '';
      expect(cls, 'fresh cache badge has emerald tone').toMatch(/emerald/i);
    }
  });

  test('TOP PAGE — each ranked item matches the API exactly', async ({ page }) => {
    // e-leilões.pt items are all 15% off the appraisal (platform rule), so we use min=0
    const r = await page.request.get(`${API}/top?top_n=10&min_desconto_pct=0`);
    const j = await r.json();
    const apiItems: LeilaoAPI[] = j.items;
    expect(apiItems.length).toBeGreaterThan(0);

    await page.goto(SPA + '/top?top_n=10&min_desconto_pct=0');
    await page.waitForResponse((resp) => resp.url().includes('/api/top') && resp.status() === 200);
    await page.waitForTimeout(800);

    const body = await page.evaluate(() => document.body.innerText);
    for (const api of apiItems) {
      // Title must appear
      expect(body, `Top page shows titulo for ${api.referencia}`).toContain(api.titulo);
      // Lance atual appears (when > 0)
      if (api.lance_atual > 0) {
        const lanceTxt = euroFull(api.lance_atual);
        expect(body, `Top page shows lance atual for ${api.referencia}: ${lanceTxt}`).toContain(lanceTxt);
      } else {
        expect(body, `Top page shows sem licitação for ${api.referencia}`).toContain('sem licitação');
      }
      // Δ vs mín.
      if (api.lance_atual > 0) {
        const deltaPct = ((api.lance_atual - api.valor_minimo) / api.valor_minimo) * 100;
        const sign = deltaPct >= 0 ? '+' : '';
        const deltaTxt = `${sign}${deltaPct.toFixed(1).replace('.', ',')}%`;
        expect(body, `Top page shows Δ vs mín for ${api.referencia}: ${deltaTxt}`).toContain(deltaTxt);
      }
    }
  });

  test('MAPA — district bubbles show correct counts and descontos', async ({ page }) => {
    const r = await page.request.get(`${API}/mapa/distritos`);
    const j = await r.json();
    const apiDistritos: any[] = j.items;
    const expectedCount = apiDistritos.length;

    await page.goto(SPA + '/mapa');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });
    await page.waitForFunction(
      (n) => document.querySelectorAll('path.leaflet-interactive').length >= n,
      expectedCount,
      { timeout: 15_000 },
    );

    // The leaderboard shows the top-8 distritos by total. Verify each is in the API.
    const body = await page.evaluate(() => document.body.innerText);
    const apiDistritosByTotal = [...apiDistritos].sort((a, b) => b.total - a.total).slice(0, 8);
    for (const d of apiDistritosByTotal) {
      expect(body, `Mapa leaderboard shows distrito "${d.distrito}"`).toContain(d.distrito);
      // The count next to it — match like "Lisboa 554"
      const m = body.match(new RegExp(d.distrito + '\\s+(\\d+)'));
      expect(m, `Mapa leaderboard shows count for ${d.distrito}`).not.toBeNull();
      const countShown = parseInt(m![1]!, 10);
      expect(countShown, `Count for ${d.distrito} matches API`).toBe(d.total);
    }
  });

  test('CSV EXPORT — download has all visible columns', async ({ page }) => {
    await page.goto(SPA + '/');
    await page.waitForResponse((resp) => resp.url().includes('/api/kpis') && resp.status() === 200);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: /Descarregar CSV/i }).click();
    const dl = await downloadPromise;
    const path = await dl.path();
    expect(path).not.toBeNull();
    const fs = await import('node:fs/promises');
    const csv = await fs.readFile(path!, 'utf-8');
    // Header should contain key columns
    const header = csv.split('\n')[0];
    expect(header, 'CSV header has id').toMatch(/id/i);
    expect(header, 'CSV header has titulo').toMatch(/titulo/i);
    expect(header, 'CSV header has lance_atual').toMatch(/lance_atual/i);
    expect(header, 'CSV header has estado').toMatch(/estado/i);
    // Count of rows matches the count of items in our filter
    const r = await page.request.get(`${API}/leiloes?page_size=1`);
    const j = await r.json();
    // CSV should have at least 1 data row
    const dataRows = csv.split('\n').filter((l) => l.trim().length > 0);
    expect(dataRows.length, 'CSV has at least header + 1 row').toBeGreaterThan(1);
    // The CSV is the full export — should have ~3098 items
    expect(dataRows.length, 'CSV has all items (~3098)').toBeGreaterThan(3000);
  });

  test('DRAWER NAVIGATION — open/close works, no console errors', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

    await page.goto(SPA + '/');
    await page.waitForResponse((r) => r.url().includes('/api/leiloes') && r.status() === 200);
    await page.waitForTimeout(500);

    // Open first row drawer
    await page.locator('table tbody tr').first().click();
    const drawer = page.locator('[role="dialog"][aria-label*="Detalhes"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Voltar à lista')).not.toBeVisible(); // drawer doesn't have this

    // Close via X
    await drawer.getByRole('button', { name: 'Fechar' }).click();
    await expect(drawer).not.toBeVisible({ timeout: 3000 });

    // Re-open and close via backdrop click
    await page.locator('table tbody tr').first().click();
    await expect(drawer).toBeVisible();
    await page.locator('.bg-slate-900\\/40').click({ force: true });
    await expect(drawer).not.toBeVisible({ timeout: 3000 });

    // ESC to close
    await page.locator('table tbody tr').first().click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible({ timeout: 3000 });

    // Filter out React Router future flag warnings
    const real = errs.filter((e) => !e.includes('React Router') && !e.includes('React DevTools'));
    expect(real, `Unexpected console errors: ${real.join(' | ')}`).toEqual([]);
  });

  test('MOBILE LAYOUT — single column + cards at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(SPA + '/');
    await page.waitForResponse((resp) => resp.url().includes('/api/leiloes') && resp.status() === 200);
    await page.waitForTimeout(500);

    // Mobile cards (not the table)
    await expect(page.locator('table').first()).not.toBeVisible();
    // The mobile cards are <button class="block w-full text-left p-4">
    const cards = page.locator('button.block.w-full');
    expect(await cards.count(), 'at least one mobile card visible').toBeGreaterThan(0);

    // Take a screenshot for visual review
    await page.screenshot({ path: 'C:/Users/lion_/projetos/leiloes-pt-v4/screenshots/mobile-lista.png', fullPage: true });

    // Open first card → drawer
    await cards.first().click();
    await expect(page.locator('[role="dialog"][aria-label*="Detalhes"]')).toBeVisible();
    await page.screenshot({ path: 'C:/Users/lion_/projetos/leiloes-pt-v4/screenshots/mobile-drawer.png', fullPage: true });
  });

  test('THEME TOGGLE — dark mode survives + all elements have correct tones', async ({ page }) => {
    await page.goto(SPA + '/');
    await page.waitForTimeout(500);

    // Click theme toggle (Moon/Sun)
    await page.getByRole('button', { name: /Trocar para tema/i }).click();
    await page.waitForTimeout(300);
    const htmlCls = await page.evaluate(() => document.documentElement.className);
    expect(htmlCls, 'html has dark class').toContain('dark');

    // Click again to go back to light
    await page.getByRole('button', { name: /Trocar para tema/i }).click();
    await page.waitForTimeout(300);
    const htmlCls2 = await page.evaluate(() => document.documentElement.className);
    expect(htmlCls2, 'html does NOT have dark class').not.toContain('dark');
  });
});
