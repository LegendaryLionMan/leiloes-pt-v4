import { LeilaoItem } from './data';

export interface Alert {
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
}

let ALERTS: Alert[] = [
  {
    id: 'alt-001',
    name: 'Imóveis Lisboa com Desconto',
    distrito: ['Lisboa'],
    concelho: [],
    categoria: ['Imóvel'],
    valor_max: 300000,
    desconto_min: 25,
    only_novos_24h: false,
    texto_livre: null,
    active: true,
    created_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    updated_at: null,
  },
  {
    id: 'alt-002',
    name: 'Veículos Novos em Todo o País',
    distrito: [],
    concelho: [],
    categoria: ['Veículo'],
    valor_max: 20000,
    desconto_min: 20,
    only_novos_24h: true,
    texto_livre: null,
    active: true,
    created_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    updated_at: null,
  },
  {
    id: 'alt-003',
    name: 'Oportunidades no Porto',
    distrito: ['Porto'],
    concelho: [],
    categoria: [],
    valor_max: null,
    desconto_min: 30,
    only_novos_24h: false,
    texto_livre: null,
    active: false,
    created_at: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
    updated_at: null,
  },
];

export function getAlerts(activeOnly = false): Alert[] {
  if (activeOnly) {
    return ALERTS.filter((a) => a.active);
  }
  return ALERTS;
}

export function getAlertById(id: string): Alert | undefined {
  return ALERTS.find((a) => a.id === id);
}

export function createAlert(data: Omit<Alert, 'id' | 'created_at' | 'updated_at' | 'active'> & { active?: boolean }): Alert {
  const newAlert: Alert = {
    id: 'alt-' + Math.random().toString(36).substring(2, 9),
    name: data.name,
    distrito: data.distrito || [],
    concelho: data.concelho || [],
    categoria: data.categoria || [],
    valor_max: data.valor_max ?? null,
    desconto_min: data.desconto_min ?? null,
    only_novos_24h: Boolean(data.only_novos_24h),
    texto_livre: data.texto_livre ?? null,
    active: data.active !== undefined ? data.active : true,
    created_at: new Date().toISOString(),
    updated_at: null,
  };
  ALERTS.unshift(newAlert);
  return newAlert;
}

export function patchAlert(id: string, patch: Partial<Alert>): Alert | null {
  const alert = ALERTS.find((a) => a.id === id);
  if (!alert) return null;

  if (patch.name !== undefined) alert.name = patch.name;
  if (patch.distrito !== undefined) alert.distrito = patch.distrito;
  if (patch.concelho !== undefined) alert.concelho = patch.concelho;
  if (patch.categoria !== undefined) alert.categoria = patch.categoria;
  if (patch.valor_max !== undefined) alert.valor_max = patch.valor_max;
  if (patch.desconto_min !== undefined) alert.desconto_min = patch.desconto_min;
  if (patch.only_novos_24h !== undefined) alert.only_novos_24h = patch.only_novos_24h;
  if (patch.texto_livre !== undefined) alert.texto_livre = patch.texto_livre;
  if (patch.active !== undefined) alert.active = patch.active;
  alert.updated_at = new Date().toISOString();

  return alert;
}

export function toggleAlert(id: string): { id: string; active: boolean } | null {
  const alert = ALERTS.find((a) => a.id === id);
  if (!alert) return null;
  alert.active = !alert.active;
  alert.updated_at = new Date().toISOString();
  return { id: alert.id, active: alert.active };
}

export function deleteAlert(id: string): boolean {
  const idx = ALERTS.findIndex((a) => a.id === id);
  if (idx >= 0) {
    ALERTS.splice(idx, 1);
    return true;
  }
  return false;
}

export function matchAlert(alert: Alert, items: LeilaoItem[]): LeilaoItem[] {
  return items.filter((item) => {
    if (alert.distrito && alert.distrito.length > 0) {
      if (!alert.distrito.includes(item.distrito)) return false;
    }
    if (alert.concelho && alert.concelho.length > 0) {
      if (!alert.concelho.includes(item.concelho)) return false;
    }
    if (alert.categoria && alert.categoria.length > 0) {
      if (!alert.categoria.includes(item.categoria)) return false;
    }
    if (alert.valor_max !== null && alert.valor_max !== undefined) {
      if (item.valor_minimo > alert.valor_max) return false;
    }
    if (alert.desconto_min !== null && alert.desconto_min !== undefined) {
      if (item.poupanca_pct < alert.desconto_min) return false;
    }
    if (alert.only_novos_24h && !item.novo_24h) {
      return false;
    }
    if (alert.texto_livre && alert.texto_livre.trim() !== '') {
      const q = alert.texto_livre.toLowerCase();
      const haystack = `${item.titulo} ${item.descricao ?? ''} ${item.distrito} ${item.concelho}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
