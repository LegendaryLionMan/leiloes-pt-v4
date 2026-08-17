import { useQuery } from '@tanstack/react-query';
import { Map } from 'lucide-react';
import { fetchAggDistrito } from '@/lib/api';
import { Card, ErrorState, Spinner } from '@/lib/ui';

export default function Mapa() {
  // Even though we don't have a geo-coords layer on the v3 data, we can render
  // a choropleth-free district summary grid with proportional area for now.
  const dist = useQuery({ queryKey: ['agg-dist'], queryFn: fetchAggDistrito });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Map size={24} className="text-brand-teal" /> Mapa
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Distribuição de leilões por distrito. Tamanho proporcional à quantidade, cor proporcional ao desconto médio.
        </p>
      </header>

      {dist.isLoading && <div className="flex justify-center p-12"><Spinner /></div>}
      {dist.isError && <ErrorState message="Falha a carregar mapa" />}

      {dist.data && (
        <Card className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {dist.data.items.map((d: any, i: number) => {
              const max = Math.max(...dist.data!.items.map((x: any) => x.total));
              const scale = 0.55 + (d.total / max) * 0.45;
              const desconto = d.desconto_medio_pct ?? 0;
              const color = desconto >= 50 ? '#10b981'
                : desconto >= 35 ? '#14b8a6'
                : desconto >= 25 ? '#0F766E'
                : '#475569';
              return (
                <div
                  key={d.distrito}
                  className="rounded-xl p-4 cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}66`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: `${100 / scale}%`,
                  }}
                >
                  <p className="font-medium" style={{ color }}>{d.distrito}</p>
                  <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{d.total}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    desconto médio {desconto.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
        Próxima fase: Choropleth real de Portugal por distrito (geojson boundaries) + pins por leilão.
      </p>
    </div>
  );
}
