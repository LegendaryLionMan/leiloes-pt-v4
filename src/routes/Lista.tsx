import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLeiloes, fetchKPIs, type FilterParams } from '@/lib/api';
import KPICard from '@/components/KPICard';

export default function Lista() {
  const [filters, setFilters] = useState<FilterParams>({});
  const leiloesQuery = useQuery({
    queryKey: ['leiloes', filters],
    queryFn: () => fetchLeiloes(filters),
  });
  const kpisQuery = useQuery({
    queryKey: ['kpis', filters],
    queryFn: () => fetchKPIs(filters),
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Lista ({leiloesQuery.data?.count ?? '...'})</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Filtered view of all 3,068 Portuguese auction items.
        </p>
      </header>

      {/* Filter pill row — TODO: Tavira preset, new-24h, ≤30d, clear */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilters({ distrito: ['Faro'], concelho: ['Tavira'], categoria: ['Imóvel'] })}
          className="px-4 py-2 rounded-lg bg-brand-teal text-white font-medium"
        >
          🏖️ Tavira — Imóveis + Terrenos
        </button>
        <button
          onClick={() => setFilters({ novos_24h: !filters.novos_24h })}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
        >
          🆕 Só novos 24h
        </button>
        <button
          onClick={() => setFilters({ encerram_30d: !filters.encerram_30d })}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
        >
          🔥 Encerram ≤30d
        </button>
        <button
          onClick={() => setFilters({})}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
        >
          🔄 Limpar tudo
        </button>
      </div>

      {/* KPIs */}
      {kpisQuery.data && (
        <div className="grid grid-cols-3 gap-3">
          <KPICard label="Total no scope" value={kpisQuery.data.total.toLocaleString('pt-PT')} icon="📦" />
          <KPICard label="Novos (24h)" value={kpisQuery.data.novos_24h.toLocaleString('pt-PT')} delta="+24h" icon="🆕" />
          <KPICard label="Valor mínimo total" value={`${(kpisQuery.data.valor_minimo_total / 1000).toFixed(0)}k €`} icon="💶" />
          <KPICard label="Poupança potencial" value={`${(kpisQuery.data.poupanca_potencial / 1000).toFixed(0)}k €`} delta={`${kpisQuery.data.desconto_medio_pct.toFixed(1)}%`} icon="💰" accent="#10b981" />
          <KPICard label="Distritos" value={kpisQuery.data.distritos.toString()} icon="🗺️" />
          <KPICard label="Encerram (≤7d)" value={kpisQuery.data.encerram_7d.toString()} delta="urgente" icon="⏰" accent="#f59e0b" />
        </div>
      )}

      {/* Lista */}
      {leiloesQuery.isLoading && <div>Loading…</div>}
      {leiloesQuery.error && <div className="text-red-500">Erro: {String(leiloesQuery.error)}</div>}
      {leiloesQuery.data && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Distrito</th>
                <th className="text-left px-4 py-3 font-medium">Concelho</th>
                <th className="text-right px-4 py-3 font-medium">Valor mín.</th>
                <th className="text-right px-4 py-3 font-medium">Poupança %</th>
              </tr>
            </thead>
            <tbody>
              {leiloesQuery.data.items.map((it) => (
                <tr key={it.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-2">{it.titulo}</td>
                  <td className="px-4 py-2 text-slate-500">{it.categoria}</td>
                  <td className="px-4 py-2 text-slate-500">{it.distrito ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{it.concelho ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {it.valor_minimo?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-500">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}