import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export interface Leilao {
  id: number;
  titulo: string;
  categoria: string;
  distrito?: string;
  concelho?: string;
  valor_minimo?: number;
  valor_mercado?: number;
  data_publicacao?: string;
  data_encerramento?: string;
  url?: string;
}

export interface KPIs {
  total: number;
  novos_24h: number;
  valor_minimo_total: number;
  poupanca_potencial: number;
  desconto_medio_pct: number;
  distritos: number;
  encerram_7d: number;
}

export interface FilterParams {
  distrito?: string[];
  concelho?: string[];
  categoria?: string[];
  novos_24h?: boolean;
  encerram_30d?: boolean;
}

export async function fetchLeiloes(params: FilterParams = {}) {
  const search = new URLSearchParams();
  for (const [k, vs] of Object.entries(params)) {
    if (Array.isArray(vs)) vs.forEach((v) => search.append(k, v));
    else if (vs !== undefined) search.set(k, String(vs));
  }
  const { data } = await api.get<{ count: number; items: Leilao[] }>(`/leiloes?${search}`);
  return data;
}

export async function fetchKPIs(params: FilterParams = {}) {
  const search = new URLSearchParams();
  for (const [k, vs] of Object.entries(params)) {
    if (Array.isArray(vs)) vs.forEach((v) => search.append(k, v));
    else if (vs !== undefined) search.set(k, String(vs));
  }
  const { data } = await api.get<KPIs>(`/kpis?${search}`);
  return data;
}