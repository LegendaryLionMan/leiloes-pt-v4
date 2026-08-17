import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, TrendingUp } from 'lucide-react';
import { fetchFacets, fetchTop, type Leilao } from '@/lib/api';
import { Card, EmptyState, ErrorState, Spinner, cx, categoryEmoji, formatEUR, formatPct, urgencyBadge } from '@/lib/ui';

export default function Top() {
  const [minDesconto, setMinDesconto] = useState(30);
  const [distrito, setDistrito] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);

  const facets = useQuery({ queryKey: ['facets'], queryFn: fetchFacets });
  const top = useQuery({
    queryKey: ['top', minDesconto, distrito, categoria],
    queryFn: () => fetchTop({
      top_n: 25,
      min_desconto_pct: minDesconto,
      distrito: distrito ? [distrito] : undefined,
      categoria: categoria ? [categoria] : undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp size={24} className="text-emerald-600" />
          Top oportunidades
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ordenadas por poupança potencial absoluta (€). Filtro mínimo de desconto aplicado.
        </p>
      </header>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
              Desconto mínimo: <strong className="text-slate-900 dark:text-slate-100">{minDesconto}%</strong>
            </label>
            <input
              type="range"
              min="0"
              max="70"
              step="5"
              value={minDesconto}
              onChange={(e) => setMinDesconto(Number(e.target.value))}
              className="w-full accent-brand-teal"
              aria-label="Desconto mínimo"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span><span>70%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Distrito</label>
            <select
              value={distrito ?? ''}
              onChange={(e) => setDistrito(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              aria-label="Filtrar por distrito"
            >
              <option value="">Todos</option>
              {facets.data?.distritos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Categoria</label>
            <select
              value={categoria ?? ''}
              onChange={(e) => setCategoria(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas</option>
              {facets.data?.categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {top.isLoading && (
        <div className="flex justify-center p-12"><Spinner /></div>
      )}
      {top.isError && <ErrorState message="Falha a carregar top oportunidades" onRetry={() => top.refetch()} />}
      {top.data && top.data.items.length === 0 && (
        <EmptyState icon="🎯" title="Nenhuma oportunidade corresponde aos filtros" />
      )}
      {top.data && top.data.items.length > 0 && (
        <div className="space-y-2">
          {top.data.items.map((it, i) => (
            <TopRow key={it.id} item={it} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopRow({ item, rank }: { item: Leilao; rank: number }) {
  const u = urgencyBadge(item.dias_ate_encerramento);
  return (
    <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className={cx(
        'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-base',
        rank === 1 ? 'bg-yellow-400 text-yellow-900'
        : rank === 2 ? 'bg-slate-300 text-slate-700'
        : rank === 3 ? 'bg-amber-600 text-white'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      )}>
        #{rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span aria-hidden className="text-xl">{categoryEmoji(item.categoria)}</span>
          <p className="font-medium truncate">{item.titulo}</p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {item.distrito} · {item.concelho}{item.freguesia ? ` · ${item.freguesia}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
          −{formatPct(item.poupanca_pct, 1)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {formatEUR(item.poupanca_potencial, { compact: true })}
        </p>
        <span className={cx(
          'inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1',
          u.tone === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          : u.tone === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        )}>
          {u.label}
        </span>
      </div>
      {item.link && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label="Abrir leilão"
           className="p-2 rounded-lg text-slate-500 hover:text-brand-teal hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ExternalLink size={16} />
        </a>
      )}
    </Card>
  );
}
