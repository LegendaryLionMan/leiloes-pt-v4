import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Map as MapIcon, ArrowLeft, Layers, List } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { fetchMapaDistritos, fetchMapaConcelhos } from '@/lib/api';
import { Card, ErrorState, Spinner, cx, formatEUR, formatNumber } from '@/lib/ui';

type DistritoPoint = {
  distrito: string;
  lat: number;
  lon: number;
  total: number;
  valor_minimo_total: number;
  poupanca_total: number;
  desconto_medio_pct: number;
};

type ConcelhoPoint = DistritoPoint & { concelho: string };

export default function Mapa() {
  const [view, setView] = useState<'distritos' | 'concelhos'>('distritos');
  const [selectedDistrito, setSelectedDistrito] = useState<string | null>(null);

  const distritos = useQuery({
    queryKey: ['mapa-distritos'],
    queryFn: fetchMapaDistritos,
    staleTime: 5 * 60_000,
  });

  const concelhos = useQuery({
    queryKey: ['mapa-concelhos', selectedDistrito],
    queryFn: () => fetchMapaConcelhos(selectedDistrito ?? undefined),
    staleTime: 5 * 60_000,
  });

  if (distritos.isLoading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <MapIcon size={24} className="text-brand-teal" /> Mapa
        </h2>
        <Card className="p-8"><Spinner /></Card>
      </div>
    );
  }

  if (distritos.isError) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <MapIcon size={24} className="text-brand-teal" /> Mapa
        </h2>
        <ErrorState message="Falha a carregar mapa" />
      </div>
    );
  }

  const distritoData = distritos.data?.items ?? [];
  const concelhoData = concelhos.data?.items ?? [];

  // Sizing: bubble radius proportional to sqrt(total) so area ~ count
  const totals = view === 'distritos' ? distritoData.map((d) => d.total) : concelhoData.map((c) => c.total);
  const maxTotal = Math.max(1, ...totals);
  const radius = (n: number) => Math.max(6, Math.min(40, Math.sqrt(n / maxTotal) * 36));

  // Color scale by desconto_medio_pct
  const color = (desc: number) =>
    desc >= 35 ? '#0F766E' :  // emerald
    desc >= 30 ? '#10B981' :  // teal
    desc >= 25 ? '#3B82F6' :  // blue
    desc >= 20 ? '#F59E0B' :  // amber
                  '#94A3B8';   // slate

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapIcon size={24} className="text-brand-teal" /> Mapa
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {distritoData.length} distritos · {distritoData.reduce((s, d) => s + d.total, 0).toLocaleString('pt-PT')} leilões · clique numa bolha para drill-down
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedDistrito && (
            <button
              onClick={() => setSelectedDistrito(null)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[40px]"
            >
              <ArrowLeft size={14} /> Voltar aos distritos
            </button>
          )}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              onClick={() => { setView('distritos'); setSelectedDistrito(null); }}
              className={cx(
                'px-3 py-2 text-sm font-medium min-h-[40px] inline-flex items-center gap-1',
                view === 'distritos' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50',
              )}
              aria-pressed={view === 'distritos'}
            >
              <Layers size={14} /> Distritos
            </button>
            <button
              onClick={() => setView('concelhos')}
              className={cx(
                'px-3 py-2 text-sm font-medium min-h-[40px] inline-flex items-center gap-1',
                view === 'concelhos' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50',
              )}
              aria-pressed={view === 'concelhos'}
            >
              <List size={14} /> Concelhos
            </button>
          </div>
        </div>
      </header>

      <Card className="p-0 overflow-hidden">
        <div className="h-[640px] relative">
          <MapContainer
            center={[39.5, -8.0]}
            zoom={7}
            minZoom={6}
            maxZoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {(view === 'distritos' ? distritoData : concelhoData).map((pt, i) => (
              <CircleMarker
                key={i}
                center={[pt.lat, pt.lon]}
                radius={radius(pt.total)}
                pathOptions={{
                  color: color(pt.desconto_medio_pct),
                  fillColor: color(pt.desconto_medio_pct),
                  fillOpacity: 0.65,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (view === 'distritos') {
                      setSelectedDistrito(pt.distrito);
                    }
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -radius(pt.total) / 2]} opacity={0.95}>
                  <div className="text-xs">
                    <strong>{view === 'distritos' ? pt.distrito : (pt as ConcelhoPoint).concelho}</strong>
                    <br />{formatNumber(pt.total)} leilões
                    <br />{pt.desconto_medio_pct.toFixed(1)}% desconto médio
                  </div>
                </Tooltip>
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold">
                      {view === 'distritos' ? pt.distrito : (pt as ConcelhoPoint).concelho}
                      {view === 'concelhos' && <span className="font-normal text-slate-500"> · {(pt as ConcelhoPoint).distrito}</span>}
                    </h3>
                    <dl className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Leilões:</dt>
                        <dd className="font-medium">{formatNumber(pt.total)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Valor mínimo total:</dt>
                        <dd className="font-medium">{formatEUR(pt.valor_minimo_total, { compact: true })}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Poupança potencial:</dt>
                        <dd className="font-medium text-emerald-600">{formatEUR(pt.poupanca_total, { compact: true })}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Desconto médio:</dt>
                        <dd className="font-medium">{pt.desconto_medio_pct.toFixed(1)}%</dd>
                      </div>
                    </dl>
                    {view === 'distritos' && (
                      <button
                        onClick={() => setSelectedDistrito(pt.distrito)}
                        className="mt-3 text-xs text-brand-teal hover:underline"
                      >
                        Ver concelhos de {pt.distrito} →
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs">
            <p className="font-semibold mb-1">Tamanho da bolha = nº de leilões</p>
            <p className="font-semibold mb-2">Cor = % desconto médio</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#0F766E' }} /> ≥35% (excelente)</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#10B981' }} /> ≥30%</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }} /> ≥25%</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} /> ≥20%</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#94A3B8' }} /> &lt;20%</li>
            </ul>
          </div>

          {/* Top-3 leaderboard */}
          <div className="absolute top-4 right-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-lg shadow-lg p-3 w-64 max-h-[400px] overflow-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {view === 'distritos' ? 'Top distritos' : `Top concelhos${selectedDistrito ? ` (${selectedDistrito})` : ''}`}
            </p>
            <ol className="space-y-1.5">
              {(view === 'distritos' ? distritoData : concelhoData)
                .slice()
                .sort((a, b) => b.total - a.total)
                .slice(0, 8)
                .map((pt, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-slate-400 tabular-nums text-xs">{i + 1}.</span>
                      <span className="truncate">
                        {view === 'distritos' ? pt.distrito : (pt as ConcelhoPoint).concelho}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums text-xs text-brand-teal">{pt.total}</span>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      </Card>

      {view === 'distritos' && selectedDistrito && (
        <Card className="p-4">
          <p className="text-sm">
            Mostrando concelhos de <strong>{selectedDistrito}</strong>. Carregue numa bolha do mapa para ver mais detalhe, ou volte aos distritos.
          </p>
        </Card>
      )}
    </div>
  );
}