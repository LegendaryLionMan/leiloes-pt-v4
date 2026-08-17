// Frontend API client — talks to FastAPI on :8001 via vite proxy at /api
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// --- Types ----------------------------------------------------------------

export type Leilao = {
  id: number;
  referencia: string;
  titulo: string;
  categoria: string;
  distrito?: string;
  concelho?: string;
  freguesia?: string;
  valor_avaliacao?: number;
  valor_minimo?: number;
  valor_mercado_estimado?: number;
  poupanca_potencial?: number;
  poupanca_pct?: number;
  data_publicacao?: string;
  data_encerramento?: string;
  dias_ate_encerramento?: number;
  estado?: string;
  modalidade?: string;
  link?: string;
};

export type KPIs = {
  total: number;
  novos_24h: number;
  valor_minimo_total: number;
  poupanca_potencial: number;
  desconto_medio_pct: number;
  distritos: number;
  concelhos: number;
  encerram_7d: number;
};

export type FilterParams = {
  distrito?: string[];
  concelho?: string[];
  categoria?: string[];
  estado?: string[];
  valor_min?: number;
  valor_max?: number;
  novos_24h?: boolean;
  encerram_30d?: boolean;
  min_desconto_pct?: number;
  ordenar_por?: 'data_encerramento' | 'data_publicacao' | 'valor_minimo' | 'poupanca_potencial' | 'poupanca_pct' | 'titulo';
  ordem?: 'asc' | 'desc';
  texto_livre?: string;
  page?: number;
  page_size?: number;
};

export type Facets = {
  distritos: string[];
  concelhos: string[];
  categorias: string[];
  estados: string[];
  modalidades: string[];
};

export type Alert = {
  id: string;
  name: string;
  distrito: string[];
  concelho: string[];
  categoria: string[];
  valor_max: number | null;
  desconto_min: number | null;
  only_novos_24h: boolean;
  texto_livre: string | null;
  active: boolean;
  created_at: string;
  updated_at?: string | null;
};

// --- Helpers --------------------------------------------------------------

function paramsFrom(f: FilterParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else if (typeof v === 'boolean') sp.set(k, String(v));
    else sp.set(k, String(v));
  }
  return sp.toString();
}

// --- Endpoint helpers -----------------------------------------------------

export async function fetchHealth() {
  const { data } = await api.get('/health');
  return data as { status: string; version: string };
}

export async function fetchCacheInfo() {
  const { data } = await api.get('/cache/info');
  return data as { fonte: string; cache_age_hours: number; cache_timestamp: string; is_stale: boolean; items_total: number };
}

export async function fetchKPIs(f: FilterParams = {}): Promise<KPIs> {
  const { data } = await api.get(`kpis?${paramsFrom(f)}`);
  return data;
}

export async function fetchLeiloes(f: FilterParams = {}): Promise<{
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Leilao[];
}> {
  const { data } = await api.get(`leiloes?${paramsFrom(f)}`);
  return data;
}

export async function fetchLeilaoDetail(id: number): Promise<Leilao> {
  const { data } = await api.get(`leiloes/${id}`);
  return data;
}

export async function fetchTop(opts: { top_n?: number; min_desconto_pct?: number; distrito?: string[]; categoria?: string[] } = {}): Promise<{ count: number; items: Leilao[] }> {
  const sp = new URLSearchParams();
  if (opts.top_n) sp.set('top_n', String(opts.top_n));
  if (opts.min_desconto_pct !== undefined) sp.set('min_desconto_pct', String(opts.min_desconto_pct));
  (opts.distrito ?? []).forEach((d) => sp.append('distrito', d));
  (opts.categoria ?? []).forEach((c) => sp.append('categoria', c));
  const { data } = await api.get(`top?${sp}`);
  return data;
}

export async function fetchAggCategoria(distrito?: string[]): Promise<{ count: number; items: any[] }> {
  const sp = new URLSearchParams();
  (distrito ?? []).forEach((d) => sp.append('distrito', d));
  const qs = sp.toString();
  const { data } = await api.get(`agregados/categoria${qs ? '?' + qs : ''}`);
  return data;
}

export async function fetchAggDistrito(): Promise<{ count: number; items: any[] }> {
  const { data } = await api.get('agregados/distrito');
  return data;
}

export async function fetchAggConcelho(distrito?: string): Promise<{ count: number; items: any[] }> {
  const sp = new URLSearchParams();
  if (distrito) sp.set('distrito', distrito);
  const { data } = await api.get(`agregados/concelho?${sp}`);
  return data;
}

export async function fetchSeriesPublicacao(): Promise<{ count: number; days: any[]; categories: string[] }> {
  const { data } = await api.get('series/publicacao');
  return data;
}

export async function fetchSeriesEncerramento(): Promise<{ count: number; days: any[] }> {
  const { data } = await api.get('series/encerramento');
  return data;
}

export async function fetchFacets(): Promise<Facets> {
  const { data } = await api.get('filtros/facets');
  return data;
}

export async function fetchAlertas(active_only = false): Promise<{ count: number; items: Alert[] }> {
  const { data } = await api.get(`alertas${active_only ? '?active_only=true' : ''}`);
  return data;
}

export async function createAlerta(a: Omit<Alert, 'id' | 'created_at' | 'updated_at' | 'active'> & { active?: boolean }) {
  const { data } = await api.post('alertas', a);
  return data;
}

export async function patchAlerta(id: string, patch: Partial<Alert>) {
  const { data } = await api.patch(`alertas/${id}`, patch);
  return data;
}

export async function toggleAlerta(id: string) {
  const { data } = await api.post(`alertas/${id}/toggle`);
  return data;
}

export async function deleteAlerta(id: string) {
  await api.delete(`alertas/${id}`);
}

export async function fetchAllMatches(active_only = true): Promise<{ count: number; items: { alert: Alert; matches: Leilao[] }[] }> {
  const { data } = await api.get(`matches${active_only ? '?active_only=true' : ''}`);
  return data;
}

export async function fetchAlertMatches(id: string): Promise<{ alert: Alert; matches: Leilao[] }> {
  const { data } = await api.get(`matches/${id}`);
  return data;
}

export async function fetchMapaDistritos(): Promise<{
  count: number;
  items: { distrito: string; lat: number; lon: number; total: number; valor_minimo_total: number; poupanca_total: number; desconto_medio_pct: number }[];
}> {
  const { data } = await api.get('mapa/distritos');
  return data;
}

export async function fetchMapaConcelhos(distrito?: string): Promise<{
  count: number;
  items: { concelho: string; distrito: string; lat: number; lon: number; total: number; valor_minimo_total: number; poupanca_total: number; desconto_medio_pct: number }[];
}> {
  const qs = distrito ? `?distrito=${encodeURIComponent(distrito)}` : '';
  const { data } = await api.get(`mapa/concelhos${qs}`);
  return data;
}

export function csvExportUrl(f: FilterParams = {}): string {
  return `/api/export/leiloes.csv?${paramsFrom(f)}`;
}

// cache-bust
