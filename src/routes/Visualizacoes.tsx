import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import {
  fetchAggCategoria, fetchAggDistrito, fetchSeriesEncerramento, fetchSeriesPublicacao,
} from '@/lib/api';
import { Card, ErrorState, Spinner } from '@/lib/ui';

const COLORS = ['#0F766E', '#14b8a6', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];

// Disable animations globally — saves bandwidth on dark-mode render quirks.
// (gem-design-md-guidelines + scrap skill recommendation: respect prefers-reduced-motion)
const NO_ANIM = { isAnimationActive: false } as const;

export default function Visualizacoes() {
  // Use raw fetch for agg/categoria — React Query + StrictMode raced it earlier.
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
  const seriesPub = useQuery({ queryKey: ['series-pub'], queryFn: fetchSeriesPublicacao });
  const seriesEnc = useQuery({ queryKey: ['series-enc'], queryFn: fetchSeriesEncerramento });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 size={24} className="text-brand-teal" /> Visualizações
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Agregações dos 3 068 leilões reais — categoria, distrito, publicações, encerramentos.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut: categoria */}
        <Card className="p-4">
          <p className="font-medium mb-3">Por categoria (quantidade)</p>
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
                >
                  {aggCat.data.items.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Bar: distrito */}
        <Card className="p-4">
          <p className="font-medium mb-3">Por distrito (top 10)</p>
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
                <Bar {...NO_ANIM} dataKey="total" fill="#0F766E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Line: publications per day */}
        <Card className="p-4 lg:col-span-2">
          <p className="font-medium mb-3">Publicações nos últimos 30 dias (por categoria)</p>
          {seriesPub.isLoading && <Spinner />}
          {seriesPub.isError && <ErrorState message="Falha a carregar" />}
          {seriesPub.data && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={seriesPub.data.days.map((d: any) => ({ ...d, dia: new Date(d.dia).toLocaleDateString('pt-PT') }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                {(seriesPub.data.categories ?? []).map((cat, i) => (
                  <Line {...NO_ANIM} key={cat} type="monotone" dataKey={cat}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                        dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                        activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Bar: encerramentos upcoming */}
        <Card className="p-4 lg:col-span-2">
          <p className="font-medium mb-3">Encerramentos nos próximos 30 dias (valor mínimo total)</p>
          {seriesEnc.isLoading && <Spinner />}
          {seriesEnc.isError && <ErrorState message="Falha a carregar" />}
          {seriesEnc.data && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seriesEnc.data.days.slice(0, 30).map((d: any) => ({
                ...d,
                dia: new Date(d.dia).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
                  formatter={(v: number) => `${(v / 1000).toFixed(0)} k€`}
                />
                <Bar {...NO_ANIM} dataKey="valor_minimo" fill="#0F766E" radius={[4, 4, 0, 0]} name="Valor mínimo" />
                <Bar {...NO_ANIM} dataKey="poupanca" fill="#10b981" radius={[4, 4, 0, 0]} name="Poupança" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
