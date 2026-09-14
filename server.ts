import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  getRawItems,
  getCacheMeta,
  refreshDataStore,
  applyFilters,
  sortItems,
  computeKPIs,
  computeFacets,
  computeAggCategoria,
  computeAggDistrito,
  computeAggConcelho,
  computeMapaDistritos,
  computeMapaConcelhos,
  computeSeriesPublicacao,
  computeSeriesEncerramento,
  computeTimeline,
  computeScatter,
  computeEstados,
  computeModalidade,
  FilterParams,
  LeilaoItem,
} from './server/data';
import {
  getAlerts,
  getAlertById,
  createAlert,
  patchAlert,
  toggleAlert,
  deleteAlert,
  matchAlert,
} from './server/alerts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Helpers for query params
function toArray(val: unknown): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.map(String);
  return [String(val)];
}

function parseFilterParams(req: Request): FilterParams {
  const q = req.query;
  return {
    distrito: toArray(q.distrito),
    concelho: toArray(q.concelho),
    categoria: toArray(q.categoria),
    estado: toArray(q.estado),
    valor_min: q.valor_min ? Number(q.valor_min) : undefined,
    valor_max: q.valor_max ? Number(q.valor_max) : undefined,
    novos_24h: q.novos_24h === 'true' || q.novos_24h === '1',
    encerram_30d: q.encerram_30d === 'true' || q.encerram_30d === '1',
    min_desconto_pct: q.min_desconto_pct ? Number(q.min_desconto_pct) : undefined,
    ordenar_por: (q.ordenar_por as FilterParams['ordenar_por']) || 'data_encerramento',
    ordem: (q.ordem as 'asc' | 'desc') || 'asc',
    texto_livre: q.texto_livre ? String(q.texto_livre) : undefined,
    incluir_passados: q.incluir_passados === 'true',
    page: q.page ? Math.max(1, Number(q.page)) : 1,
    page_size: q.page_size ? Math.min(500, Math.max(1, Number(q.page_size))) : 50,
    cursor: q.cursor ? String(q.cursor) : undefined,
  };
}

// --- API Routes ---

// Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '0.4.7',
    errors_recent: [],
    errors_total_buffered: 0,
    errors_buffer_capacity: 50,
  });
});

// Cache info & refresh
app.get('/api/cache/info', (_req: Request, res: Response) => {
  res.json(getCacheMeta());
});

app.post('/api/cache/refresh', (_req: Request, res: Response) => {
  refreshDataStore();
  res.json({
    status: 'started',
    note: 'A cache foi refrescada com sucesso.',
  });
});

// KPIs
app.get('/api/kpis', (req: Request, res: Response) => {
  const filters = parseFilterParams(req);
  const items = applyFilters(getRawItems(), filters);
  const kpis = computeKPIs(items);
  res.json(kpis);
});

// Leilões list
app.get('/api/leiloes', (req: Request, res: Response) => {
  const filters = parseFilterParams(req);
  let items = applyFilters(getRawItems(), filters);
  items = sortItems(items, filters.ordenar_por, filters.ordem);

  if (filters.cursor) {
    const cursorId = Number(filters.cursor);
    if (!isNaN(cursorId)) {
      items = items.filter((it) => it.id > cursorId);
    }
  }

  const total = items.length;
  const page = filters.page || 1;
  const pageSize = filters.page_size || 50;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const nextCursor = pageItems.length === pageSize ? String(pageItems[pageItems.length - 1].id) : null;

  res.json({
    count: total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
    next_cursor: nextCursor,
    items: pageItems,
  });
});

// Single leilao detail
app.get('/api/leiloes/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = getRawItems().find((i) => i.id === id);
  if (!item) {
    res.status(404).json({ error: `Leilão ${id} não encontrado` });
    return;
  }
  res.json(item);
});

// Top opportunities
app.get('/api/top', (req: Request, res: Response) => {
  const topN = req.query.top_n ? Number(req.query.top_n) : 15;
  const minDesconto = req.query.min_desconto_pct ? Number(req.query.min_desconto_pct) : 0;
  const distrito = toArray(req.query.distrito);
  const categoria = toArray(req.query.categoria);

  let items = applyFilters(getRawItems(), { distrito, categoria, min_desconto_pct: minDesconto });
  items = items.filter((i) => i.dias_ate_encerramento >= 0);
  items.sort((a, b) => b.poupanca_potencial - a.poupanca_potencial);

  const topItems = items.slice(0, topN);
  res.json({
    count: topItems.length,
    items: topItems,
  });
});

// Aggregations
app.get('/api/agregados/categoria', (req: Request, res: Response) => {
  const distrito = toArray(req.query.distrito);
  let items = getRawItems();
  if (distrito && distrito.length > 0) {
    items = applyFilters(items, { distrito });
  }
  const result = computeAggCategoria(items);
  res.json({ count: result.length, items: result });
});

app.get('/api/agregados/distrito', (_req: Request, res: Response) => {
  const result = computeAggDistrito(getRawItems());
  res.json({ count: result.length, items: result });
});

app.get('/api/agregados/concelho', (req: Request, res: Response) => {
  const distrito = req.query.distrito ? String(req.query.distrito) : undefined;
  const result = computeAggConcelho(getRawItems(), distrito);
  res.json({ count: result.length, items: result });
});

// Time series
app.get('/api/series/publicacao', (_req: Request, res: Response) => {
  const series = computeSeriesPublicacao(getRawItems());
  res.json(series);
});

app.get('/api/series/encerramento', (_req: Request, res: Response) => {
  const series = computeSeriesEncerramento(getRawItems());
  res.json(series);
});

app.get('/api/series/timeline', (req: Request, res: Response) => {
  const distrito = toArray(req.query.distrito);
  const categoria = toArray(req.query.categoria);
  const items = applyFilters(getRawItems(), { distrito, categoria });
  const timeline = computeTimeline(items);
  res.json(timeline);
});

// Facets
app.get('/api/filtros/facets', (_req: Request, res: Response) => {
  const facets = computeFacets(getRawItems());
  res.json(facets);
});

// Leaflet map endpoints
app.get('/api/mapa/distritos', (_req: Request, res: Response) => {
  const items = computeMapaDistritos(getRawItems());
  res.json({ count: items.length, items });
});

app.get('/api/mapa/concelhos', (req: Request, res: Response) => {
  const distrito = req.query.distrito ? String(req.query.distrito) : undefined;
  const items = computeMapaConcelhos(getRawItems(), distrito);
  res.json({ count: items.length, items });
});

// Scatter & exploratory
app.get('/api/scatter/lance-vs-min', (req: Request, res: Response) => {
  const distrito = toArray(req.query.distrito);
  const categoria = toArray(req.query.categoria);
  const modalidade = toArray(req.query.modalidade);
  const minDesconto = req.query.min_desconto_pct ? Number(req.query.min_desconto_pct) : undefined;
  const maxPoints = req.query.max_points ? Number(req.query.max_points) : 500;

  let items = applyFilters(getRawItems(), { distrito, categoria, min_desconto_pct: minDesconto });
  if (modalidade && modalidade.length > 0) {
    items = items.filter((i) => modalidade.includes(i.modalidade));
  }
  const pts = computeScatter(items, maxPoints);
  res.json({ count: pts.length, items: pts });
});

// KPIs por estado
app.get('/api/kpis/estados', (req: Request, res: Response) => {
  const distrito = toArray(req.query.distrito);
  const categoria = toArray(req.query.categoria);
  const items = applyFilters(getRawItems(), { distrito, categoria });
  res.json(computeEstados(items));
});

// Aggregados por modalidade
app.get('/api/agregados/modalidade', (req: Request, res: Response) => {
  const distrito = toArray(req.query.distrito);
  const categoria = toArray(req.query.categoria);
  const items = applyFilters(getRawItems(), { distrito, categoria });
  const aggs = computeModalidade(items);
  res.json({ count: aggs.length, items: aggs });
});

// CSV export
app.get('/api/export/leiloes.csv', (req: Request, res: Response) => {
  const filters = parseFilterParams(req);
  const items = applyFilters(getRawItems(), filters);

  const cols: (keyof LeilaoItem)[] = [
    'id',
    'referencia',
    'titulo',
    'categoria',
    'distrito',
    'concelho',
    'freguesia',
    'valor_avaliacao',
    'valor_minimo',
    'valor_mercado_estimado',
    'lance_atual',
    'desconto_vs_avaliacao_pct',
    'poupanca_potencial',
    'poupanca_pct',
    'data_publicacao',
    'data_encerramento',
    'dias_ate_encerramento',
    'estado',
    'praca',
    'modalidade',
    'fonte',
    'link',
  ];

  let csv = cols.join(',') + '\n';
  for (const it of items) {
    const row = cols.map((col) => {
      const val = it[col];
      if (val === undefined || val === null) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csv += row.join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=leiloes.csv');
  res.send(csv);
});

// --- Alerts CRUD ---

app.get('/api/alertas', (req: Request, res: Response) => {
  const activeOnly = req.query.active_only === 'true';
  const alerts = getAlerts(activeOnly);
  res.json({ count: alerts.length, items: alerts });
});

app.post('/api/alertas', (req: Request, res: Response) => {
  const { name, distrito, concelho, categoria, valor_max, desconto_min, only_novos_24h, texto_livre, active } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Nome do alerta é obrigatório' });
    return;
  }
  const alert = createAlert({
    name,
    distrito: Array.isArray(distrito) ? distrito : [],
    concelho: Array.isArray(concelho) ? concelho : [],
    categoria: Array.isArray(categoria) ? categoria : [],
    valor_max: valor_max !== undefined && valor_max !== null ? Number(valor_max) : null,
    desconto_min: desconto_min !== undefined && desconto_min !== null ? Number(desconto_min) : null,
    only_novos_24h: Boolean(only_novos_24h),
    texto_livre: texto_livre || null,
    active: active !== undefined ? Boolean(active) : true,
  });
  res.status(201).json(alert);
});

app.patch('/api/alertas/:id', (req: Request, res: Response) => {
  const updated = patchAlert(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Alerta não encontrado' });
    return;
  }
  res.json(updated);
});

app.post('/api/alertas/:id/toggle', (req: Request, res: Response) => {
  const result = toggleAlert(req.params.id);
  if (!result) {
    res.status(404).json({ error: 'Alerta não encontrado' });
    return;
  }
  res.json(result);
});

app.delete('/api/alertas/:id', (req: Request, res: Response) => {
  const deleted = deleteAlert(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Alerta não encontrado' });
    return;
  }
  res.status(204).send();
});

// --- Matches ---

app.get('/api/matches', (req: Request, res: Response) => {
  const activeOnly = req.query.active_only !== 'false';
  const alerts = getAlerts(activeOnly);
  const rawItems = getRawItems();

  const items = alerts.map((alert) => ({
    alert,
    matches: matchAlert(alert, rawItems).slice(0, 100),
  }));

  res.json({ count: items.length, items });
});

app.get('/api/matches/:id', (req: Request, res: Response) => {
  const alert = getAlertById(req.params.id);
  if (!alert) {
    res.status(404).json({ error: 'Alerta não encontrado' });
    return;
  }
  const matches = matchAlert(alert, getRawItems()).slice(0, 100);
  res.json({ alert, matches });
});

// --- Vite / Static Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Leilões Portugal server running on port ${PORT}`);
  });
}

startServer();
