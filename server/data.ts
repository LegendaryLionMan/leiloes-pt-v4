import { coordDistrito, coordConcelho } from './geo';

export interface LeilaoItem {
  id: number;
  referencia: string;
  titulo: string;
  descricao?: string;
  categoria: string;
  distrito: string;
  concelho: string;
  freguesia: string;
  valor_avaliacao: number;
  valor_minimo: number;
  valor_mercado_estimado: number;
  lance_atual: number;
  poupanca_potencial: number;
  poupanca_pct: number;
  desconto_vs_avaliacao_pct: number;
  data_publicacao: string;
  data_encerramento: string;
  data_abertura: string;
  dias_ate_encerramento: number;
  estado: 'Em curso' | 'Agendado' | 'Terminado' | 'Cancelado';
  praca: string;
  modalidade: 'Leilão Online' | 'Negociação Particular';
  fonte: string;
  link: string;
  foto?: string;
  novo_24h: boolean;
}

export interface FilterParams {
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
  incluir_passados?: boolean;
  page?: number;
  page_size?: number;
  cursor?: string;
}

// Seed templates for generating rich, diverse auctions across Portuguese regions
const TEMPLATES: Array<{
  categoria: string;
  tituloPrefix: string;
  descricao: string;
  baseMin: number;
  baseMax: number;
}> = [
  { categoria: 'Imóvel', tituloPrefix: 'Apartamento T2', descricao: 'Apartamento com boas áreas, varanda e lugar de garagem.', baseMin: 95000, baseMax: 260000 },
  { categoria: 'Imóvel', tituloPrefix: 'Moradia V3', descricao: 'Moradia unifamiliar com logradouro e jardim privativo.', baseMin: 180000, baseMax: 450000 },
  { categoria: 'Imóvel', tituloPrefix: 'Terreno Urbano para Construção', descricao: 'Lote de terreno com viabilidade construtiva para habitação.', baseMin: 40000, baseMax: 130000 },
  { categoria: 'Imóvel', tituloPrefix: 'Apartamento T1 Centro Histórico', descricao: 'Fração autónoma renovada, excelente para rendimento.', baseMin: 85000, baseMax: 175000 },
  { categoria: 'Imóvel', tituloPrefix: 'Prédio em Propriedade Total', descricao: 'Edifício com 3 pisos, rés-do-chão comercial e 2 pisos habitacionais.', baseMin: 220000, baseMax: 650000 },
  { categoria: 'Veículo', tituloPrefix: 'Mercedes-Benz C220d Station', descricao: 'Viatura ligeira de passageiros, ano 2020, gasóleo, 85.000 km.', baseMin: 16000, baseMax: 28000 },
  { categoria: 'Veículo', tituloPrefix: 'Renault Megane Sport Tourer', descricao: 'Ligeiro de passageiros 1.5 dCi, 2019, 110.000 km.', baseMin: 8500, baseMax: 15000 },
  { categoria: 'Veículo', tituloPrefix: 'BMW Série 3 Touring', descricao: 'Ligeiro de passageiros, ano 2021, híbrido plug-in.', baseMin: 22000, baseMax: 35000 },
  { categoria: 'Veículo', tituloPrefix: 'Furgão Ford Transit 350', descricao: 'Viatura ligeira de mercadorias com caixa fechada, 2018.', baseMin: 7000, baseMax: 14000 },
  { categoria: 'Equipamento', tituloPrefix: 'Empilhador Elétrico Toyota 2.5T', descricao: 'Empilhador elétrico trifásico com carregador e mastro triplex.', baseMin: 6500, baseMax: 14000 },
  { categoria: 'Equipamento', tituloPrefix: 'Centro de Maquinagem CNC', descricao: 'Equipamento industrial de corte e maquinação de alta precisão.', baseMin: 18000, baseMax: 48000 },
  { categoria: 'Máquina', tituloPrefix: 'Retroescavadora Caterpillar 428F', descricao: 'Máquina de movimentação de terras em estado operacional.', baseMin: 25000, baseMax: 55000 },
  { categoria: 'Mobiliário', tituloPrefix: 'Lote de Mobiliário de Escritório Executivo', descricao: 'Secretárias, cadeiras ergonómicas e armários arquivadores.', baseMin: 1800, baseMax: 4500 },
  { categoria: 'Direito', tituloPrefix: 'Quinhão Hereditário sobre Fração Habitacional', descricao: 'Direito a quinhão indiviso de 1/3 em herança aberta.', baseMin: 15000, baseMax: 40000 },
  { categoria: 'Outro', tituloPrefix: 'Stock Comercial de Artigos de Iluminação LED', descricao: 'Lote composto por painéis, projetores e lâmpadas novas em caixa.', baseMin: 2500, baseMax: 8000 },
];

const LOCALIDADES = [
  { distrito: 'Lisboa', concelho: 'Lisboa', freguesia: 'Parque das Nações' },
  { distrito: 'Lisboa', concelho: 'Cascais', freguesia: 'Cascais e Estoril' },
  { distrito: 'Lisboa', concelho: 'Sintra', freguesia: 'Queluz e Belas' },
  { distrito: 'Lisboa', concelho: 'Oeiras', freguesia: 'Oeiras e São Julião da Barra' },
  { distrito: 'Lisboa', concelho: 'Torres Vedras', freguesia: 'Santa Maria e São Pedro' },
  { distrito: 'Lisboa', concelho: 'Mafra', freguesia: 'Ericeira' },
  { distrito: 'Porto', concelho: 'Porto', freguesia: 'Cedofeita, Santo Ildefonso' },
  { distrito: 'Porto', concelho: 'Vila Nova de Gaia', freguesia: 'Canidelo' },
  { distrito: 'Porto', concelho: 'Matosinhos', freguesia: 'Senhora da Hora' },
  { distrito: 'Porto', concelho: 'Maia', freguesia: 'Cidade da Maia' },
  { distrito: 'Porto', concelho: 'Gondomar', freguesia: 'Rio Tinto' },
  { distrito: 'Braga', concelho: 'Braga', freguesia: 'São Victor' },
  { distrito: 'Braga', concelho: 'Guimarães', freguesia: 'Costa' },
  { distrito: 'Braga', concelho: 'Famalicão', freguesia: 'Vila Nova de Famalicão' },
  { distrito: 'Setúbal', concelho: 'Setúbal', freguesia: 'São Sebastião' },
  { distrito: 'Setúbal', concelho: 'Almada', freguesia: 'Costa de Caparica' },
  { distrito: 'Setúbal', concelho: 'Seixal', freguesia: 'Amora' },
  { distrito: 'Faro', concelho: 'Faro', freguesia: 'Sé e São Pedro' },
  { distrito: 'Faro', concelho: 'Loulé', freguesia: 'Quarteira' },
  { distrito: 'Faro', concelho: 'Albufeira', freguesia: 'Albufeira e Olhos de Água' },
  { distrito: 'Faro', concelho: 'Portimão', freguesia: 'Alvor' },
  { distrito: 'Coimbra', concelho: 'Coimbra', freguesia: 'Santo António dos Olivais' },
  { distrito: 'Coimbra', concelho: 'Figueira da Foz', freguesia: 'Buarcos e São Julião' },
  { distrito: 'Aveiro', concelho: 'Aveiro', freguesia: 'Glória e Vera Cruz' },
  { distrito: 'Aveiro', concelho: 'Ílhavo', freguesia: 'Gafanha da Nazaré' },
  { distrito: 'Leiria', concelho: 'Leiria', freguesia: 'Marrazes e Barosa' },
  { distrito: 'Leiria', concelho: 'Caldas da Rainha', freguesia: 'Nossa Senhora do Pópulo' },
  { distrito: 'Santarém', concelho: 'Santarém', freguesia: 'Marvila' },
  { distrito: 'Santarém', concelho: 'Tomar', freguesia: 'Santa Maria dos Olivais' },
  { distrito: 'Évora', concelho: 'Évora', freguesia: 'Sé e São Pedro' },
  { distrito: 'Viseu', concelho: 'Viseu', freguesia: 'Viseu' },
  { distrito: 'Viana do Castelo', concelho: 'Viana do Castelo', freguesia: 'Santa Maria Maior' },
  { distrito: 'Vila Real', concelho: 'Vila Real', freguesia: 'Vila Real' },
  { distrito: 'Castelo Branco', concelho: 'Castelo Branco', freguesia: 'Castelo Branco' },
  { distrito: 'Guarda', concelho: 'Guarda', freguesia: 'Guarda' },
  { distrito: 'Beja', concelho: 'Beja', freguesia: 'Santiago Maior' },
  { distrito: 'Bragança', concelho: 'Bragança', freguesia: 'Sé' },
  { distrito: 'Portalegre', concelho: 'Portalegre', freguesia: 'Sé' },
];

function generateSeedData(): LeilaoItem[] {
  const now = new Date();
  const items: LeilaoItem[] = [];

  let idCounter = 1001;

  for (let i = 0; i < 150; i++) {
    const tmpl = TEMPLATES[i % TEMPLATES.length];
    const loc = LOCALIDADES[i % LOCALIDADES.length];
    const id = idCounter++;

    // Randomize base value in range
    const range = tmpl.baseMax - tmpl.baseMin;
    const factor = ((i * 37 + 13) % 100) / 100;
    const valor_avaliacao = Math.round(tmpl.baseMin + range * factor);

    // e-leilões: valorMinimo is exactly 85% of valorBase (valor_avaliacao)
    const valor_minimo = Math.round(valor_avaliacao * 0.85);

    // estimated market value is approx 1.45x
    const valor_mercado_estimado = Math.round(valor_avaliacao * 1.45);

    // State & dates
    // 0-110: Em curso
    // 111-125: Agendado
    // 126-140: Terminado
    // 141-149: Cancelado
    let estado: 'Em curso' | 'Agendado' | 'Terminado' | 'Cancelado' = 'Em curso';
    let praca = '1ª Praça';
    let modalidade: 'Leilão Online' | 'Negociação Particular' = (i % 7 === 0) ? 'Negociação Particular' : 'Leilão Online';

    let pubOffsetHours = -((i % 40) * 12 + 4);
    if (i % 12 === 0) {
      // novo 24h!
      pubOffsetHours = -((i % 18) + 1);
    }
    const dataPub = new Date(now.getTime() + pubOffsetHours * 3600 * 1000);

    let endOffsetDays = ((i * 11) % 45) - 3;
    if (i >= 126 && i <= 140) {
      estado = 'Terminado';
      endOffsetDays = -((i % 10) + 1);
    } else if (i >= 141) {
      estado = 'Cancelado';
      praca = 'Cancelado';
      endOffsetDays = -((i % 15) + 2);
    } else if (i >= 111) {
      estado = 'Agendado';
      endOffsetDays = (i % 20) + 15;
    } else {
      estado = 'Em curso';
      if (endOffsetDays <= 0) endOffsetDays = (i % 28) + 1;
      if (i % 5 === 0) praca = '2ª Praça';
    }

    const dataEnd = new Date(now.getTime() + endOffsetDays * 86400 * 1000);
    const dias_ate = Math.floor((dataEnd.getTime() - now.getTime()) / (86400 * 1000));

    // Current bid
    let lance_atual = 0;
    if (estado === 'Em curso' && (i % 3 !== 0)) {
      // Has bids: between minimum and 1.1x minimum
      lance_atual = Math.round(valor_minimo * (1 + (i % 15) / 100));
    } else if (estado === 'Terminado') {
      lance_atual = Math.round(valor_minimo * (1 + (i % 25) / 100));
    }

    // Savings: market value minus floor/bid
    const piso = Math.max(lance_atual, valor_minimo);
    const poupanca_potencial = Math.max(0, valor_mercado_estimado - piso);
    const poupanca_pct = Number(((poupanca_potencial / valor_mercado_estimado) * 100).toFixed(1));
    const desconto_vs_avaliacao_pct = Number(((1 - valor_minimo / valor_avaliacao) * 100).toFixed(1));

    const refNum = (100000 + id).toString();
    const referencia = `LEIL-${loc.distrito.substring(0, 3).toUpperCase()}-${refNum}`;
    const titulo = `${tmpl.tituloPrefix} em ${loc.concelho}`;

    const isNovo = (now.getTime() - dataPub.getTime()) <= 24 * 3600 * 1000;

    items.push({
      id,
      referencia,
      titulo,
      descricao: `${tmpl.descricao} Localizado em ${loc.freguesia}, concelho de ${loc.concelho}, distrito de ${loc.distrito}.`,
      categoria: tmpl.categoria,
      distrito: loc.distrito,
      concelho: loc.concelho,
      freguesia: loc.freguesia,
      valor_avaliacao,
      valor_minimo,
      valor_mercado_estimado,
      lance_atual,
      poupanca_potencial,
      poupanca_pct,
      desconto_vs_avaliacao_pct,
      data_publicacao: dataPub.toISOString(),
      data_encerramento: dataEnd.toISOString(),
      data_abertura: dataPub.toISOString(),
      dias_ate_encerramento: dias_ate,
      estado,
      praca,
      modalidade,
      fonte: 'E-LEILÕES',
      link: `https://www.e-leiloes.pt/eventos/${referencia.toLowerCase()}`,
      novo_24h: isNovo,
    });
  }

  return items;
}

let DATA_STORE: LeilaoItem[] = generateSeedData();
let CACHE_TIMESTAMP = new Date().toISOString();

export function getRawItems(): LeilaoItem[] {
  return DATA_STORE;
}

export function refreshDataStore() {
  DATA_STORE = generateSeedData();
  CACHE_TIMESTAMP = new Date().toISOString();
}

export function getCacheMeta() {
  return {
    fonte: 'e-leilões.pt',
    cache_age_hours: 0.1,
    cache_timestamp: CACHE_TIMESTAMP,
    is_stale: false,
    items_total: DATA_STORE.length,
  };
}

export function applyFilters(items: LeilaoItem[], filters: FilterParams): LeilaoItem[] {
  return items.filter((item) => {
    if (filters.distrito && filters.distrito.length > 0) {
      if (!filters.distrito.includes(item.distrito)) return false;
    }
    if (filters.concelho && filters.concelho.length > 0) {
      if (!filters.concelho.includes(item.concelho)) return false;
    }
    if (filters.categoria && filters.categoria.length > 0) {
      if (!filters.categoria.includes(item.categoria)) return false;
    }
    if (filters.estado && filters.estado.length > 0) {
      if (!filters.estado.includes(item.estado)) return false;
    }
    if (filters.valor_min !== undefined && filters.valor_min !== null) {
      if (item.valor_minimo < filters.valor_min) return false;
    }
    if (filters.valor_max !== undefined && filters.valor_max !== null) {
      if (item.valor_minimo > filters.valor_max) return false;
    }
    if (filters.novos_24h && !item.novo_24h) {
      return false;
    }
    if (filters.encerram_30d) {
      if (item.dias_ate_encerramento < 0 || item.dias_ate_encerramento > 30) return false;
    }
    if (filters.min_desconto_pct !== undefined && filters.min_desconto_pct !== null) {
      if (item.poupanca_pct < filters.min_desconto_pct) return false;
    }
    if (!filters.incluir_passados && item.dias_ate_encerramento < 0) {
      return false;
    }
    if (filters.texto_livre && filters.texto_livre.trim() !== '') {
      const q = filters.texto_livre.toLowerCase().trim();
      const haystack = `${item.titulo} ${item.descricao ?? ''} ${item.concelho} ${item.distrito} ${item.referencia}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortItems(
  items: LeilaoItem[],
  sortBy: FilterParams['ordenar_por'] = 'data_encerramento',
  order: 'asc' | 'desc' = 'asc'
): LeilaoItem[] {
  const sorted = [...items];
  const mul = order === 'desc' ? -1 : 1;

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'data_publicacao':
        return mul * (new Date(a.data_publicacao).getTime() - new Date(b.data_publicacao).getTime());
      case 'valor_minimo':
        return mul * (a.valor_minimo - b.valor_minimo);
      case 'poupanca_potencial':
        return mul * (a.poupanca_potencial - b.poupanca_potencial);
      case 'poupanca_pct':
        return mul * (a.poupanca_pct - b.poupanca_pct);
      case 'titulo':
        return mul * a.titulo.localeCompare(b.titulo);
      case 'data_encerramento':
      default:
        return mul * (new Date(a.data_encerramento).getTime() - new Date(b.data_encerramento).getTime());
    }
  });

  return sorted;
}

export function computeKPIs(items: LeilaoItem[]) {
  // Only active auctions
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const total = active.length;
  const novos_24h = active.filter((it) => it.novo_24h).length;
  const valor_minimo_total = active.reduce((acc, it) => acc + it.valor_minimo, 0);
  const poupanca_potencial = active.reduce((acc, it) => acc + it.poupanca_potencial, 0);
  const desconto_medio_pct = total > 0
    ? Number((active.reduce((acc, it) => acc + it.poupanca_pct, 0) / total).toFixed(1))
    : 0;

  const distritos = new Set(active.map((it) => it.distrito)).size;
  const concelhos = new Set(active.map((it) => it.concelho)).size;
  const encerram_7d = active.filter((it) => it.dias_ate_encerramento >= 0 && it.dias_ate_encerramento <= 7).length;

  return {
    total,
    novos_24h,
    valor_minimo_total,
    poupanca_potencial,
    desconto_medio_pct,
    distritos,
    concelhos,
    encerram_7d,
  };
}

export function computeFacets(items: LeilaoItem[]) {
  const distritos = Array.from(new Set(items.map((i) => i.distrito).filter(Boolean))).sort();
  const concelhos = Array.from(new Set(items.map((i) => i.concelho).filter(Boolean))).sort();
  const categorias = Array.from(new Set(items.map((i) => i.categoria).filter(Boolean))).sort();
  const estados = Array.from(new Set(items.map((i) => i.estado).filter(Boolean))).sort();
  const modalidades = Array.from(new Set(items.map((i) => i.modalidade).filter(Boolean))).sort();

  return { distritos, concelhos, categorias, estados, modalidades };
}

export function computeAggCategoria(items: LeilaoItem[]) {
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const groups = new Map<string, LeilaoItem[]>();

  for (const it of active) {
    const list = groups.get(it.categoria) || [];
    list.push(it);
    groups.set(it.categoria, list);
  }

  const result = Array.from(groups.entries()).map(([categoria, gItems]) => {
    const total = gItems.length;
    const valor_minimo_total = Math.round(gItems.reduce((acc, i) => acc + i.valor_minimo, 0));
    const valor_mercado_total = Math.round(gItems.reduce((acc, i) => acc + i.valor_mercado_estimado, 0));
    const poupanca_total = Math.round(gItems.reduce((acc, i) => acc + i.poupanca_potencial, 0));
    const desconto_medio_pct = total > 0 ? Number((gItems.reduce((acc, i) => acc + i.poupanca_pct, 0) / total).toFixed(1)) : 0;
    const valor_medio_minimo = total > 0 ? Math.round(valor_minimo_total / total) : 0;

    return {
      categoria,
      total,
      valor_minimo_total,
      valor_mercado_total,
      poupanca_total,
      desconto_medio_pct,
      valor_medio_minimo,
    };
  });

  result.sort((a, b) => b.poupanca_total - a.poupanca_total);
  return result;
}

export function computeAggDistrito(items: LeilaoItem[]) {
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const groups = new Map<string, LeilaoItem[]>();

  for (const it of active) {
    const list = groups.get(it.distrito) || [];
    list.push(it);
    groups.set(it.distrito, list);
  }

  const result = Array.from(groups.entries()).map(([distrito, gItems]) => {
    const total = gItems.length;
    const valor_minimo_total = Math.round(gItems.reduce((acc, i) => acc + i.valor_minimo, 0));
    const poupanca_total = Math.round(gItems.reduce((acc, i) => acc + i.poupanca_potencial, 0));
    const desconto_medio_pct = total > 0 ? Number((gItems.reduce((acc, i) => acc + i.poupanca_pct, 0) / total).toFixed(1)) : 0;

    return {
      distrito,
      total,
      valor_minimo_total,
      poupanca_total,
      desconto_medio_pct,
    };
  });

  result.sort((a, b) => b.total - a.total);
  return result;
}

export function computeAggConcelho(items: LeilaoItem[], distritoFilter?: string) {
  let active = items.filter((it) => it.dias_ate_encerramento >= 0);
  if (distritoFilter) {
    active = active.filter((it) => it.distrito === distritoFilter);
  }

  const groups = new Map<string, LeilaoItem[]>();
  for (const it of active) {
    const key = `${it.concelho}|${it.distrito}`;
    const list = groups.get(key) || [];
    list.push(it);
    groups.set(key, list);
  }

  const result = Array.from(groups.entries()).map(([key, gItems]) => {
    const [concelho, distrito] = key.split('|');
    const total = gItems.length;
    const valor_minimo_total = Math.round(gItems.reduce((acc, i) => acc + i.valor_minimo, 0));
    const poupanca_total = Math.round(gItems.reduce((acc, i) => acc + i.poupanca_potencial, 0));
    const desconto_medio_pct = total > 0 ? Number((gItems.reduce((acc, i) => acc + i.poupanca_pct, 0) / total).toFixed(1)) : 0;

    return {
      concelho,
      distrito,
      total,
      valor_minimo_total,
      poupanca_total,
      desconto_medio_pct,
    };
  });

  result.sort((a, b) => b.total - a.total);
  return result;
}

export function computeMapaDistritos(items: LeilaoItem[]) {
  const aggs = computeAggDistrito(items);
  return aggs.map((a) => {
    const [lat, lon] = coordDistrito(a.distrito);
    return {
      ...a,
      lat,
      lon,
    };
  });
}

export function computeMapaConcelhos(items: LeilaoItem[], distritoFilter?: string) {
  const aggs = computeAggConcelho(items, distritoFilter);
  return aggs.map((a) => {
    const [lat, lon] = coordConcelho(a.concelho, a.distrito);
    return {
      ...a,
      lat,
      lon,
    };
  });
}

export function computeSeriesPublicacao(items: LeilaoItem[]) {
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const daysMap = new Map<string, Record<string, number>>();
  const categoriesSet = new Set<string>();

  for (const it of active) {
    const day = it.data_publicacao.substring(0, 10);
    categoriesSet.add(it.categoria);
    if (!daysMap.has(day)) {
      daysMap.set(day, { dia: day as any });
    }
    const cur = daysMap.get(day)!;
    cur[it.categoria] = (cur[it.categoria] || 0) + 1;
  }

  const days = Array.from(daysMap.values()).sort((a, b) => String(a.dia).localeCompare(String(b.dia)));
  return {
    count: days.length,
    days,
    categories: Array.from(categoriesSet),
  };
}

export function computeSeriesEncerramento(items: LeilaoItem[]) {
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const daysMap = new Map<string, { dia: string; count: number; valor_minimo: number }>();

  for (const it of active) {
    const day = it.data_encerramento.substring(0, 10);
    if (!daysMap.has(day)) {
      daysMap.set(day, { dia: day, count: 0, valor_minimo: 0 });
    }
    const cur = daysMap.get(day)!;
    cur.count += 1;
    cur.valor_minimo += it.valor_minimo;
  }

  const days = Array.from(daysMap.values()).sort((a, b) => a.dia.localeCompare(b.dia));
  return {
    count: days.length,
    days,
  };
}

export function computeTimeline(items: LeilaoItem[]) {
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const daysMap = new Map<string, { dia: string; publicacoes: number; encerramentos: number; valor_enc: number }>();

  let publicacoes_total = 0;
  let encerramentos_total = 0;

  for (const it of active) {
    const pDay = it.data_publicacao.substring(0, 10);
    const eDay = it.data_encerramento.substring(0, 10);

    if (!daysMap.has(pDay)) {
      daysMap.set(pDay, { dia: pDay, publicacoes: 0, encerramentos: 0, valor_enc: 0 });
    }
    daysMap.get(pDay)!.publicacoes += 1;
    publicacoes_total += 1;

    if (!daysMap.has(eDay)) {
      daysMap.set(eDay, { dia: eDay, publicacoes: 0, encerramentos: 0, valor_enc: 0 });
    }
    daysMap.get(eDay)!.encerramentos += 1;
    daysMap.get(eDay)!.valor_enc += it.valor_minimo;
    encerramentos_total += 1;
  }

  const dias = Array.from(daysMap.values()).sort((a, b) => a.dia.localeCompare(b.dia));
  return {
    count: dias.length,
    dias,
    publicacoes_total,
    encerramentos_total,
  };
}

export function computeScatter(items: LeilaoItem[], maxPoints = 500) {
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const sample = active.slice(0, maxPoints);

  const points = sample.map((it) => {
    const delta_pct = it.valor_minimo > 0
      ? Number((((it.lance_atual - it.valor_minimo) / it.valor_minimo) * 100).toFixed(1))
      : 0;

    return {
      x: it.valor_minimo,
      y: it.lance_atual || it.valor_minimo,
      delta_pct,
      ref: it.referencia,
      titulo: it.titulo,
      distrito: it.distrito,
      categoria: it.categoria,
      modalidade: it.modalidade,
    };
  });

  return points;
}

export function computeEstados(items: LeilaoItem[]) {
  const counts = {
    'Em curso': 0,
    Terminado: 0,
    Cancelado: 0,
    Agendado: 0,
    total: items.length,
  };

  for (const it of items) {
    if (it.estado in counts) {
      counts[it.estado as keyof typeof counts] += 1;
    }
  }

  return counts;
}

export function computeModalidade(items: LeilaoItem[]) {
  const active = items.filter((it) => it.dias_ate_encerramento >= 0);
  const groups = new Map<string, LeilaoItem[]>();

  for (const it of active) {
    const list = groups.get(it.modalidade) || [];
    list.push(it);
    groups.set(it.modalidade, list);
  }

  return Array.from(groups.entries()).map(([modalidade, gItems]) => {
    const total = gItems.length;
    const valor_minimo_total = Math.round(gItems.reduce((acc, i) => acc + i.valor_minimo, 0));
    const valor_avaliacao_total = Math.round(gItems.reduce((acc, i) => acc + i.valor_avaliacao, 0));
    const com_lance = gItems.filter((i) => i.lance_atual > 0).length;
    const desconto_medio_pct = total > 0 ? Number((gItems.reduce((acc, i) => acc + i.poupanca_pct, 0) / total).toFixed(1)) : 0;

    return {
      modalidade,
      total,
      valor_minimo_total,
      valor_avaliacao_total,
      com_lance,
      desconto_medio_pct,
    };
  });
}
