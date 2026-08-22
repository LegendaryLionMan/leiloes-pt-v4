import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ScTooltip, ResponsiveContainer, ZAxis,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, Line,
  ComposedChart, Legend,
} from 'recharts';
import { BarChart3, Activity, Crosshair } from 'lucide-react';
import {
  fetchAggCategoria, fetchAggDistrito,
  fetchScatter, fetchEstados, fetchTimeline, fetchModalidade,
} from '@/lib/api';
import { Card, ErrorState, Spinner, cx, formatEUR, formatNumber } from '@/lib/ui';

const COLORS = ['#0F766E', '#14b8a6', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];
const NO_ANIM = { isAnimationActive: false } as const;

type DrillSelection = { distrito?: string; categoria?: string; modalidade?: string };

export default function Visualizacoes() {
  const [drill, setDrill] = useState<DrillSelection>({});

  // Top-row cards (KPIs by estado)
  const estados = useQuery({
    queryKey: ['estados', drill.distrito, drill.categoria],
    queryFn: () => fetchEstados({ distrito: drill.distrito ? [drill.distrito] : [], categoria: drill.categoria ? [drill.categoria] : [] }),
  });

  const [aggCatState, setAggCatState] = useState<{ data?: any; loading: boolean; error: boolean }>(
    { loading: true, error: false }
  );
  useEffect(() => {
    let alive = true;
    fetchAggCategoria()
      .then((d) => alive && setAggCatState({ data: d, loading: false, error: false }))
      .catch(() => alive && setAggCatState({ data: undefined, loading: false, error: true }));
    return () => { alive = false; };
  }, []);
  const aggCat = {
    isLoading: aggCatState.loading,
    isError: aggCatState.error,
    data: aggCatState.data,
  };
  const aggDist = useQuery({ queryKey: ['agg-dist'], queryFn: fetchAggDistrito });
  // (replaced by timeline endpoint)
  const timeline = useQuery({ queryKey: ['timeline', drill.distrito, drill.categoria], queryFn: () => fetchTimeline({ distrito: drill.distrito ? [drill.distrito] : [], categoria: drill.categoria ? [drill.categoria] : [] }) });
  const scatter = useQuery({
    queryKey: ['scatter', drill.distrito, drill.categoria, drill.modalidade],
    queryFn: () => fetchScatter({ distrito: drill.distrito ? [drill.distrito] : [], categoria: drill.categoria ? [drill.categoria] : [], modalidade: drill.modalidade ? [drill.modalidade] : [], max_points: 600 }),
  });
  const modalidade = useQuery({ queryKey: ['modalidade', drill.distrito, drill.categoria], queryFn: () => fetchModalidade({ distrito: drill.distrito ? [drill.distrito] : [], categoria: drill.categoria ? [drill.categoria] : [] }) });

  const clearDrill = () => setDrill({});

  // Build scatter data — split below/at/above the reference line (y=x)
  const scatterAnalysis = useMemo(() => {
    if (!scatter.data?.items) return null;
    const below: any[] = [];
    const above: any[] = [];
    const atFloor: any[] = [];
    for (const p of scatter.data.items) {
      if (p.delta_pct < -1) below.push(p);
      else if (p.delta_pct > 1) above.push(p);
      else atFloor.push(p);
    }
    return {
      below,
      above,
      atFloor,
      total: scatter.data.items.length,
    };
  }, [scatter.data]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={24} className="text-brand-teal" /> Visualizações
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            3 098 leilões reais — clique numa barra/ponto para drill-down.
          </p>
        </div>
        {(drill.distrito || drill.categoria || drill.modalidade) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Filtros ativos:</span>
            {drill.distrito && (
              <span className="px-2 py-1 bg-brand-teal/10 text-brand-teal rounded-full">📍 {drill.distrito}</span>
            )}
            {drill.categoria && (
              <span className="px-2 py-1 bg-brand-teal/10 text-brand-teal rounded-full">🏷️ {drill.categoria}</span>
            )}
            {drill.modalidade && (
              <span className="px-2 py-1 bg-brand-teal/10 text-brand-teal rounded-full">⚡ {drill.modalidade}</span>
            )}
            <button
              onClick={clearDrill}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
              title="Limpar filtros"
            >
              limpar
            </button>
          </div>
        )}
      </header>

      {/* KPI strip — estados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <EstadoCard
          label="Em curso"
          value={estados.data?.['Em curso'] ?? '…'}
          color="emerald"
          icon={<Activity size={14} />}
          sub="licitação ativa"
        />
        <EstadoCard
          label="Terminado"
          value={estados.data?.Terminado ?? '…'}
          color="slate"
          icon={<Crosshair size={14} />}
          sub="prazo expirado"
        />
        <EstadoCard
          label="Cancelado"
          value={estados.data?.Cancelado ?? '…'}
          color="amber"
          icon={<Crosshair size={14} />}
          sub="anulado pelo tribunal"
        />
        <EstadoCard
          label="Agendado"
          value={estados.data?.Agendado ?? '…'}
          color="blue"
          icon={<Crosshair size={14} />}
          sub="publicado, sem licit."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut: categoria (drill into categoria) */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">Por categoria (quantidade)</p>
            <p className="text-xs text-slate-500">clique numa fatia → drill</p>
          </div>
          {aggCat.isLoading && <Spinner />}
          {aggCat.isError && <ErrorState message="Falha a carregar" />}
          {aggCat.data && (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie {...NO_ANIM}
                  data={aggCat.data.items}
                  dataKey="total"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={(entry: any) => `${entry.categoria} ${entry.total}`}
                  labelLine={false}
                  onClick={(entry: any) => {
                    if (drill.categoria === entry.categoria) {
                      setDrill((d) => ({ ...d, categoria: undefined }));
                    } else {
                      setDrill((d) => ({ ...d, categoria: entry.categoria }));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {aggCat.data.items.map((item: any, i: number) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      stroke={drill.categoria === item.categoria ? '#000' : 'none'}
                      strokeWidth={drill.categoria === item.categoria ? 3 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Bar: distrito (drill into distrito) */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">Por distrito (top 10)</p>
            <p className="text-xs text-slate-500">clique → drill</p>
          </div>
          {aggDist.isLoading && <Spinner />}
          {aggDist.isError && <ErrorState message="Falha a carregar" />}
          {aggDist.data && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[...aggDist.data.items].sort((a, b) => b.total - a.total).slice(0, 10)}
                layout="vertical"
                margin={{ left: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="distrito" tick={{ fontSize: 12 }} width={80} />
                <Tooltip cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }} />
                <Bar
                  {...NO_ANIM}
                  dataKey="total"
                  fill="#0F766E"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: any) => {
                    const d = entry.distrito || entry.payload?.distrito;
                    if (d) {
                      if (drill.distrito === d) {
                        setDrill((dr) => ({ ...dr, distrito: undefined }));
                      } else {
                        setDrill((dr) => ({ ...dr, distrito: d }));
                      }
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Composed: timeline publicacoes + encerramentos */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium">Linha temporal — publicações vs encerramentos</p>
              <p className="text-xs text-slate-500">
                Últimos 10 dias + próximos 60. Publicações (azul, eixo esq) + encerramentos (verde, eixo dir).
              </p>
            </div>
          </div>
          {timeline.isLoading && <Spinner />}
          {timeline.isError && <ErrorState message="Falha a carregar" />}
          {timeline.data && (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={timeline.data.dias.map((d) => ({
                ...d,
                dia: new Date(d.dia).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={4} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Pubs', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Encs', angle: 90, position: 'insideRight', fontSize: 11 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={28} />
                <Bar {...NO_ANIM} yAxisId="left" dataKey="publicacoes" fill="#3b82f6" name="Publicações" radius={[3, 3, 0, 0]} />
                <Bar {...NO_ANIM} yAxisId="right" dataKey="encerramentos" fill="#10b981" name="Encerramentos" radius={[3, 3, 0, 0]} />
                <Line {...NO_ANIM} yAxisId="left" dataKey="valor_enc" stroke="#f59e0b" strokeWidth={2} dot={false} name="Valor encerrar (k€)" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Scatter: lance vs min — THE EXPLORATORY TOOL */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Crosshair size={16} className="text-brand-teal" />
                Lance atual vs Valor mínimo — onde estão as boas compras?
              </p>
              <p className="text-xs text-slate-500">
                {scatterAnalysis
                  ? `${scatterAnalysis.total} pontos · ${scatterAnalysis.below.length} abaixo do mínimo (verde = oportunidade) · ${scatterAnalysis.above.length} acima (laranja = licitante topou) · ${scatterAnalysis.atFloor.length} ≈ floor`
                  : 'A carregar…'}
              </p>
            </div>
          </div>
          {scatter.isLoading && <Spinner />}
          {scatter.isError && <ErrorState message="Falha a carregar" />}
          {scatter.data && (() => {
            // Synthetic y=x reference line scaled to data domain (works with log axes)
            const pts = [...(scatterAnalysis?.below ?? []), ...(scatterAnalysis?.atFloor ?? []), ...(scatterAnalysis?.above ?? [])];
            const xs = pts.map(p => p.x).filter(v => v > 0);
            const minX = Math.min(...xs); const maxX = Math.max(...xs);
            const refLine = [
              { x: Math.max(1, minX), y: Math.max(1, minX), _isRef: true },
              { x: Math.max(1, maxX), y: Math.max(1, maxX), _isRef: true },
            ];
            return (
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Valor mínimo"
                    scale="log"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    label={{ value: 'Valor mínimo (€, log)', position: 'bottom', offset: 10, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Lance atual"
                    scale="log"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    label={{ value: 'Lance atual (€, log)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <ZAxis range={[20, 80]} />
                  <ScTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      if (d._isRef) return null;
                      return (
                        <div className="bg-white dark:bg-slate-900 p-2 rounded shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
                          <p className="font-medium">{d.titulo}</p>
                          <p className="text-slate-500">{d.ref} · {d.distrito} · {d.categoria}</p>
                          <p className="mt-1">Valor mín: {formatEUR(d.x)} · Lance: {formatEUR(d.y)}</p>
                          <p className={cx('font-semibold mt-0.5', d.delta_pct < 0 ? 'text-emerald-600' : 'text-amber-600')}>
                            {d.delta_pct > 0 ? '+' : ''}{d.delta_pct.toFixed(1)}% vs mínimo
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter {...NO_ANIM} data={refLine} fill="none" line={{ stroke: '#94a3b8', strokeDasharray: '4 4', strokeWidth: 1 }} shape={() => <g />} />
                  <Scatter {...NO_ANIM} data={scatterAnalysis?.below ?? []} fill="#10b981" name="Abaixo do mínimo (bargain)" />
                  <Scatter {...NO_ANIM} data={scatterAnalysis?.atFloor ?? []} fill="#0F766E" name="No mínimo" />
                  <Scatter {...NO_ANIM} data={scatterAnalysis?.above ?? []} fill="#f59e0b" name="Acima do mínimo (overbid)" />
                  <Legend verticalAlign="top" height={28} />
                </ScatterChart>
              </ResponsiveContainer>
            );
          })()}
        </Card>

        {/* Bar: modalidade */}
        <Card className="p-4">
          <p className="font-medium mb-3">Por modalidade</p>
          {modalidade.isLoading && <Spinner />}
          {modalidade.isError && <ErrorState message="Falha a carregar" />}
          {modalidade.data && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={modalidade.data.items}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="modalidade" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
                  formatter={(v: any, name: string) => name === 'com_lance' ? `${v} com lance` : formatNumber(v as number)} />
                <Legend />
                <Bar {...NO_ANIM} dataKey="total" fill="#0F766E" name="Total" radius={[4, 4, 0, 0]} />
                <Bar {...NO_ANIM} dataKey="com_lance" fill="#10b981" name="Com lance" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Bar: categorias valor */}
        <Card className="p-4">
          <p className="font-medium mb-3">Valor mínimo por categoria (top)</p>
          {aggCat.isLoading && <Spinner />}
          {aggCat.isError && <ErrorState message="Falha a carregar" />}
          {aggCat.data && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...aggCat.data.items].sort((a: any, b: any) => b.valor_minimo_total - a.valor_minimo_total)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
                  formatter={(v: number) => `${(v / 1000).toFixed(0)} k€`}
                />
                <Bar
                  {...NO_ANIM}
                  dataKey="valor_minimo_total"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry: any) => {
                    const c = entry.categoria || entry.payload?.categoria;
                    if (c) {
                      if (drill.categoria === c) {
                        setDrill((d) => ({ ...d, categoria: undefined }));
                      } else {
                        setDrill((d) => ({ ...d, categoria: c }));
                      }
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {aggCat.data.items.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

function EstadoCard({ label, value, color, icon, sub }: { label: string; value: number | string; color: 'emerald' | 'slate' | 'amber' | 'blue'; icon?: React.ReactNode; sub?: string }) {
  const cls = {
    emerald: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20',
    slate: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900',
    amber: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
  }[color];
  const txt = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    slate: 'text-slate-700 dark:text-slate-400',
    amber: 'text-amber-700 dark:text-amber-400',
    blue: 'text-blue-700 dark:text-blue-400',
  }[color];
  return (
    <div className={cx('rounded-xl border p-3', cls)}>
      <div className="flex items-center justify-between mb-1">
        <p className={cx('text-xs uppercase tracking-wider font-medium flex items-center gap-1', txt)}>{icon}{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}