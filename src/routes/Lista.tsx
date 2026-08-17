import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Download, ExternalLink, Filter, ListChecks,
  Search, SlidersHorizontal, Trash2, TrendingDown,
} from 'lucide-react';
import {
  fetchFacets, fetchKPIs, fetchLeiloes, csvExportUrl,
  type FilterParams, type Leilao,
} from '@/lib/api';
import { Popover, SkeletonTable } from '@/lib/Drawer';
import KPICard from '@/components/KPICard';
import { Card, EmptyState, ErrorState, Pill, Spinner, cx, categoryEmoji, formatEUR, formatNumber, formatPct, urgencyBadge } from '@/lib/ui';

// Note: file path uses KPICICard.tsx due to write_file restrictions; the component file is KPICard.tsx.
// We'll fix the import below — keeping this comment intentionally as a marker for the rename.
// (See commit notes: front-end file import fix)

const PAGE_SIZE = 25;

export default function Lista() {
  const [search, setSearch] = useSearchParams();

  // Pull initial filter from URL for shareable links
  const initial: FilterParams = useMemo(() => {
    const obj: FilterParams = {};
    for (const k of ['distrito', 'concelho', 'categoria', 'estado'] as const) {
      const vs = search.getAll(k);
      if (vs.length) obj[k] = vs;
    }
    const n24 = search.get('novos_24h');
    if (n24 === '1') obj.novos_24h = true;
    const e30 = search.get('encerram_30d');
    if (e30 === '1') obj.encerram_30d = true;
    const q = search.get('q');
    if (q) obj.texto_livre = q;
    const sort = search.get('sort') as FilterParams['ordenar_por'] | null;
    if (sort) obj.ordenar_por = sort;
    const dir = search.get('ordem') as FilterParams['ordem'] | null;
    if (dir) obj.ordem = dir;
    return obj;
  }, []);

  const [filters, setFilters] = useState<FilterParams>(initial);
  const [drawerItem, setDrawerItem] = useState<Leilao | null>(null);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [page, setPage] = useState(1);

  // Sync filters → URL
  useEffect(() => {
    const sp = new URLSearchParams();
    for (const k of ['distrito', 'concelho', 'categoria', 'estado'] as const) {
      (filters[k] ?? []).forEach((v) => sp.append(k, v));
    }
    if (filters.novos_24h) sp.set('novos_24h', '1');
    if (filters.encerram_30d) sp.set('encerram_30d', '1');
    if (filters.texto_livre) sp.set('q', filters.texto_livre);
    if (filters.ordenar_por) sp.set('sort', filters.ordenar_por);
    if (filters.ordem) sp.set('ordem', filters.ordem);
    setSearch(sp, { replace: true });
  }, [filters]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const facets = useQuery({ queryKey: ['facets'], queryFn: fetchFacets });
  const kpis = useQuery({ queryKey: ['kpis', filters], queryFn: () => fetchKPIs(filters) });
  const leiloes = useQuery({
    queryKey: ['leiloes', filters, page],
    queryFn: () => fetchLeiloes({ ...filters, page, page_size: PAGE_SIZE }),
  });

  const totalActiveFilters =
    (filters.distrito?.length ?? 0) +
    (filters.concelho?.length ?? 0) +
    (filters.categoria?.length ?? 0) +
    (filters.estado?.length ?? 0) +
    (filters.novos_24h ? 1 : 0) +
    (filters.encerram_30d ? 1 : 0) +
    (filters.texto_livre ? 1 : 0);

  const toggleListItem = <K extends keyof FilterParams>(key: K, value: string) => {
    setFilters((f) => {
      const arr = (f[key] as string[] | undefined) ?? [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...f, [key]: next };
    });
  };

  const setBooleanFilter = (key: 'novos_24h' | 'encerram_30d') => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  const setTaviraPreset = () => {
    setFilters({
      distrito: ['Faro'],
      concelho: ['Tavira'],
      categoria: ['Imóvel'],
    });
  };

  const clearAll = () => {
    setFilters({});
    setPage(1);
  };

  const setSort = (by: FilterParams['ordenar_por']) => {
    setFilters((f) => ({ ...f, ordenar_por: by, ordem: f.ordem ?? 'asc' }));
  };
  const flipOrder = () => {
    setFilters((f) => ({ ...f, ordem: f.ordem === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lista</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {leiloes.data?.count.toLocaleString('pt-PT') ?? '…'} leilões
            {totalActiveFilters > 0 && ` (${totalActiveFilters} filtros ativos)`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={csvExportUrl(filters)}
            download
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px] transition-colors"
            aria-label="Descarregar CSV"
          >
            <Download size={16} /> CSV
          </a>
          <button
            onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px] transition-colors"
            aria-label={`Mudar densidade (atual: ${density})`}
          >
            <SlidersHorizontal size={16} /> {density === 'compact' ? 'Compacto' : 'Confortável'}
          </button>
        </div>
      </header>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Pill emoji="🏖️" label="Tavira — Imóveis + Terrenos" onClick={setTaviraPreset}
              active={filters.distrito?.[0] === 'Faro' && filters.concelho?.[0] === 'Tavira'}
              tone="teal" />
        <Pill emoji="🆕" label={`Só novos 24h (${kpis.data?.novos_24h ?? '…'})`}
              onClick={() => setBooleanFilter('novos_24h')}
              active={!!filters.novos_24h} tone="green" />
        <Pill emoji="🔥" label="Encerram ≤30d"
              onClick={() => setBooleanFilter('encerram_30d')}
              active={!!filters.encerram_30d} tone="amber" />
        <Pill emoji="💰" label={`Poupança ≥30%`}
              onClick={() => setFilters((f) => ({ ...f }))}  // visual placeholder
              tone="indigo" />

        {totalActiveFilters > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[36px] transition-colors"
          >
            <Trash2 size={14} /> Limpar tudo ({totalActiveFilters})
          </button>
        )}

        {/* Advanced filters popover */}
        <Popover
          trigger={(open) => (
            <button
              onClick={open}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium min-h-[36px] transition-colors"
              aria-label="Filtros avançados"
            >
              <Filter size={16} /> Filtros avançados
              <ChevronDown size={14} />
            </button>
          )}
        >
          {(close) => (
            <div className="space-y-4 max-h-[70vh] overflow-auto">
              {facets.data && (
                <>
                  <FacetGroup title="Distrito" options={facets.data.distritos}
                    selected={filters.distrito ?? []}
                    onToggle={(v) => toggleListItem('distrito', v)} />
                  <FacetGroup title="Concelho" options={facets.data.concelhos}
                    selected={filters.concelho ?? []}
                    onToggle={(v) => toggleListItem('concelho', v)} />
                  <FacetGroup title="Categoria" options={facets.data.categorias}
                    selected={filters.categoria ?? []}
                    onToggle={(v) => toggleListItem('categoria', v)} />
                  <FacetGroup title="Estado" options={facets.data.estados}
                    selected={filters.estado ?? []}
                    onToggle={(v) => toggleListItem('estado', v)} />
                  <div>
                    <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Pesquisa livre</p>
                    <input
                      value={filters.texto_livre ?? ''}
                      onChange={(e) => setFilters((f) => ({ ...f, texto_livre: e.target.value || undefined }))}
                      placeholder="ex: terreno, apartamento, gaveto…"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                </>
              )}
              {!facets.data && <Spinner />}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button onClick={clearAll} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:underline">Limpar</button>
                <button onClick={close} className="px-4 py-1.5 text-sm font-medium bg-brand-teal text-white rounded-lg">Aplicar</button>
              </div>
            </div>
          )}
        </Popover>
      </div>

      {/* KPIs */}
      {kpis.isError && <ErrorState message="Falha a carregar KPIs" onRetry={() => kpis.refetch()} />}
      {kpis.data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="Total no scope" value={formatNumber(kpis.data.total)} icon="📦" />
          <KPICard label="Novos (24h)" value={formatNumber(kpis.data.novos_24h)} icon="🆕" delta="+24h" />
          <KPICard label="Valor mínimo total" value={formatEUR(kpis.data.valor_minimo_total, { compact: true })} icon="💶" />
          <KPICard label="Poupança potencial" value={formatEUR(kpis.data.poupanca_potencial, { compact: true })}
                    delta={`${formatPct(kpis.data.desconto_medio_pct, 1)}`} icon="💰" accent="#10b981" />
          <KPICard label="Distritos" value={formatNumber(kpis.data.distritos)} icon="🗺️" />
          <KPICard label="Encerram (≤7d)" value={formatNumber(kpis.data.encerram_7d)} delta="urgente" icon="⏰" accent="#f59e0b" />
        </div>
      )}
      {!kpis.data && !kpis.isError && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-3" />
              <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      )}

      {/* Active filter banner */}
      {totalActiveFilters > 0 && (
        <Card className="p-3 flex items-center gap-2 text-sm flex-wrap"
              style={{ background: 'linear-gradient(135deg, #0F766E22 0%, #0F766E11 100%)' }}>
          <ListChecks size={16} className="text-brand-teal" />
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Filtro ativo: {[
              filters.distrito?.length ? `${filters.distrito.length} distrito(s)` : '',
              filters.concelho?.length ? `${filters.concelho.length} concelho(s)` : '',
              filters.categoria?.length ? `${filters.categoria.length} categoria(s)` : '',
              filters.novos_24h ? 'novos 24h' : '',
              filters.encerram_30d ? '≤30d' : '',
              filters.texto_livre ? `“${filters.texto_livre}”` : '',
            ].filter(Boolean).join(' · ')}
          </span>
        </Card>
      )}

      {/* Sort + density */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-slate-500 dark:text-slate-400">Ordenar por:</span>
        {(['data_encerramento', 'valor_minimo', 'poupanca_potencial', 'poupanca_pct', 'data_publicacao', 'titulo'] as const).map((by) => (
          <button
            key={by}
            onClick={() => setSort(by)}
            className={cx(
              'px-3 py-1 rounded-full border text-xs font-medium min-h-[32px]',
              filters.ordenar_por === by
                ? 'bg-brand-teal text-white border-brand-teal'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            {by === 'data_encerramento' ? 'Encerramento'
              : by === 'valor_minimo' ? 'Valor mín.'
              : by === 'poupanca_potencial' ? 'Poupança €'
              : by === 'poupanca_pct' ? 'Poupança %'
              : by === 'data_publicacao' ? 'Publicação'
              : 'Título'}
          </button>
        ))}
        <button
          onClick={flipOrder}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-medium min-h-[32px] hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label="Inverter ordem"
        >
          {filters.ordem === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {filters.ordem === 'desc' ? 'desc' : 'asc'}
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Search size={14} />
          <input
            type="search"
            placeholder="Pesquisar título, freguesia…"
            value={filters.texto_livre ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, texto_livre: e.target.value || undefined }))}
            className="px-2 py-1 border-b border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-brand-teal w-48"
          />
        </div>
      </div>

      {/* List */}
      {leiloes.isLoading && <SkeletonTable rows={6} cols={6} />}
      {leiloes.isError && <ErrorState message="Falha a carregar a lista" onRetry={() => leiloes.refetch()} />}
      {leiloes.data && leiloes.data.items.length === 0 && (
        <EmptyState icon="🪺" title="Nenhum leilão corresponde aos filtros — Limpar filtros" action={
          <button onClick={clearAll} className="text-sm font-medium text-brand-teal hover:underline">Limpar filtros</button>
        } />
      )}
      {leiloes.data && leiloes.data.items.length > 0 && (
        <Card className="overflow-hidden">
          {/* Desktop / md+ table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Título</th>
                  <th className="px-3 py-2.5 font-medium">Cat.</th>
                  <th className="px-3 py-2.5 font-medium">Distrito</th>
                  <th className="px-3 py-2.5 font-medium text-right">Valor mín.</th>
                  <th className="px-3 py-2.5 font-medium text-right">Lance atual</th>
                  <th className="px-3 py-2.5 font-medium text-right">Avaliação</th>
                  <th className="px-3 py-2.5 font-medium text-right">Desc. %</th>
                  <th className="px-3 py-2.5 font-medium text-right">Dias</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 font-medium text-right">Abrir</th>
                </tr>
              </thead>
              <tbody>
                {leiloes.data.items.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => setDrawerItem(it)}
                    className={cx(
                      'border-t border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                      density === 'compact' && 'text-sm',
                    )}
                  >
                    <td className={cx('px-3', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      <span className="mr-2" aria-hidden>{categoryEmoji(it.categoria)}</span>
                      <span className="line-clamp-2 font-medium">{it.titulo}</span>
                      {it.referencia && (
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{it.referencia}</span>
                      )}
                    </td>
                    <td className={cx('px-3 text-slate-600 dark:text-slate-400', density === 'compact' ? 'py-1.5' : 'py-2.5')}>{it.categoria}</td>
                    <td className={cx('px-3 text-slate-600 dark:text-slate-400', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      {it.distrito ?? '—'}
                      {it.concelho && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">{it.concelho}</span>
                      )}
                    </td>
                    <td className={cx('px-3 text-right tabular-nums font-semibold', density === 'compact' ? 'py-1.5' : 'py-2.5')}>{formatEUR(it.valor_minimo)}</td>
                    <td className={cx('px-3 text-right tabular-nums', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      {it.lance_atual > 0 ? (
                        <span className="text-brand-teal font-semibold">{formatEUR(it.lance_atual)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={cx('px-3 text-right tabular-nums text-slate-600 dark:text-slate-400', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      {formatEUR(it.valor_avaliacao)}
                    </td>
                    <td className={cx('px-3 text-right tabular-nums font-medium', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      {it.desconto_vs_avaliacao_pct != null ? (
                        <span className={cx(
                          it.desconto_vs_avaliacao_pct >= 30 ? 'text-emerald-600 dark:text-emerald-400' :
                          it.desconto_vs_avaliacao_pct >= 15 ? 'text-amber-600 dark:text-amber-400' :
                          'text-slate-600 dark:text-slate-400'
                        )}>
                          −{formatPct(it.desconto_vs_avaliacao_pct, 0)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={cx('px-3 text-right tabular-nums', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      {it.dias_ate_encerramento > 0 ? (
                        <span className={cx(
                          it.dias_ate_encerramento <= 7 ? 'text-red-600 dark:text-red-400 font-semibold' :
                          it.dias_ate_encerramento <= 30 ? 'text-amber-600 dark:text-amber-400' :
                          'text-slate-600 dark:text-slate-400'
                        )}>{it.dias_ate_encerramento}d</span>
                      ) : it.dias_ate_encerramento <= 0 && it.dias_ate_encerramento > -30 ? (
                        <span className="text-slate-400">−{Math.abs(it.dias_ate_encerramento)}d</span>
                      ) : '—'}
                    </td>
                    <td className={cx('px-3', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      <EstadoPill estado={it.estado} />
                    </td>
                    <td className={cx('px-3 text-right', density === 'compact' ? 'py-1.5' : 'py-2.5')}>
                      <span className="inline-block w-8 h-8 text-center text-slate-300" aria-hidden>↳</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {leiloes.data.items.map((it) => (
              <button
                key={it.id}
                onClick={() => setDrawerItem(it)}
                className="block w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-start gap-2">
                  <span aria-hidden className="text-2xl">{categoryEmoji(it.categoria)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-2">{it.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {it.distrito} · {it.concelho}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-sm font-bold tabular-nums">{formatEUR(it.valor_minimo, { compact: true })}</span>
                      {it.poupanca_pct != null && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">−{formatPct(it.poupanca_pct, 0)}</span>}
                      <UrgencyBadge days={it.dias_ate_encerramento} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {leiloes.data && leiloes.data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[36px] transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-slate-600 dark:text-slate-300">
            Página <strong>{page}</strong> de {leiloes.data.total_pages}
          </span>
          <button
            disabled={page >= leiloes.data.total_pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[36px] transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Detail drawer */}
      {drawerItem && <DetailDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function FacetGroup({ title, options, selected, onToggle }: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.slice(0, 20).map((o) => (
          <button
            key={o}
            onClick={() => onToggle(o)}
            aria-pressed={selected.includes(o)}
            className={cx(
              'px-2.5 py-1 text-xs rounded-full border transition-colors min-h-[28px]',
              selected.includes(o)
                ? 'bg-brand-teal text-white border-brand-teal'
                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function UrgencyBadge({ days }: { days: number | undefined | null }) {
  const u = urgencyBadge(days);
  if (u.label === '—') return <span className="text-slate-400">—</span>;
  const tones = {
    red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    teal:   'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    slate:  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  } as const;
  return (
    <span className={cx('inline-block px-2 py-0.5 rounded-full text-xs font-medium', tones[u.tone as keyof typeof tones])}>
      {u.label}
    </span>
  );
}

function EstadoPill({ estado }: { estado: string | undefined | null }) {
  if (!estado) return <span className="text-slate-400">—</span>;
  const tones: Record<string, string> = {
    'Em curso':   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    'Terminado':  'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    'Cancelado':  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    'Agendado':   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  };
  return (
    <span className={cx('inline-block px-2 py-0.5 rounded-full text-xs font-medium', tones[estado] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}>
      {estado}
    </span>
  );
}

function DetailDrawer({ item, onClose }: { item: Leilao; onClose: () => void }) {
  // ESC closes the drawer
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes: ${item.titulo}`}
      className="fixed inset-0 z-50"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-950 shadow-xl flex flex-col"
             style={{ animation: 'drawerSlideIn 180ms ease-out' }}>
        <header className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-lg line-clamp-2">{item.titulo}</h2>
          <button onClick={onClose} aria-label="Fechar"
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
        </header>
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-4xl">{categoryEmoji(item.categoria)}</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.categoria}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.distrito} · {item.concelho}</p>
              {item.freguesia && <p className="text-xs text-slate-500">{item.freguesia}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Valor mínimo" value={formatEUR(item.valor_minimo)} />
            <Stat label="Valor avaliação" value={formatEUR(item.valor_avaliacao)} />
            <Stat label="Lance atual" value={item.lance_atual > 0 ? formatEUR(item.lance_atual) : '—'} highlight={item.lance_atual > 0 ? 'emerald' : undefined} />
            <Stat label="Valor mercado" value={formatEUR(item.valor_mercado_estimado)} />
            {item.poupanca_pct != null && (
              <Stat label="Poupança" value={`${formatPct(item.poupanca_pct, 1)} (${formatEUR(item.poupanca_potencial, { compact: true })})`}
                    highlight="emerald" />
            )}
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500 mb-1">Encerramento</p>
            <div className="flex items-center gap-2">
              <UrgencyBadge days={item.dias_ate_encerramento} />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {item.data_encerramento ? new Date(item.data_encerramento).toLocaleString('pt-PT') : '—'}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500 mb-1">Referência e estado</p>
            <div className="flex items-center gap-2 flex-wrap">
              <EstadoPill estado={item.estado} />
              <span className="text-xs font-mono text-slate-500">{item.referencia}</span>
            </div>
          </div>
          {item.modalidade && (
            <div>
              <p className="text-xs uppercase text-slate-500 mb-1">Modalidade</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.modalidade}</p>
            </div>
          )}
          {item.praca && (
            <div>
              <p className="text-xs uppercase text-slate-500 mb-1">Praça</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.praca}</p>
            </div>
          )}
          {item.fonte && (
            <div>
              <p className="text-xs uppercase text-slate-500 mb-1">Fonte</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.fonte}</p>
            </div>
          )}

          {item.link && (
            <a href={`https://www.e-leilões.pt/`} target="_blank" rel="noopener noreferrer"
               onClick={() => navigator.clipboard?.writeText(item.referencia ?? '')}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 min-h-[44px]"
               title="Abre o e-leilões.pt e procura pela referência (copiada automaticamente)">
              <ExternalLink size={16} /> Abrir e-leilões.pt
            </a>
          )}
          <style>{`@keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: 'emerald' | 'amber' }) {
  const cls = highlight === 'emerald'
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    : highlight === 'amber'
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
  return (
    <div className={cx('rounded-lg border p-3', cls)}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-base font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
