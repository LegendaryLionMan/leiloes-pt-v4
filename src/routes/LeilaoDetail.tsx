import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, MapPin, Calendar, Tag, Gavel, TrendingDown, AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { fetchLeilaoDetail, type Leilao } from '@/lib/api';
import { Card, ErrorState, Spinner, cx } from '@/lib/ui';

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export default function LeilaoDetail() {
  const { id } = useParams<{ id: string }>();
  const leilaoId = Number(id);
  const q = useQuery({
    queryKey: ['leilao', leilaoId],
    queryFn: () => fetchLeilaoDetail(leilaoId),
    enabled: Number.isFinite(leilaoId),
    staleTime: 60_000,
  });

  if (!Number.isFinite(leilaoId)) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <ErrorState message="ID de leilão inválido" />
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm text-brand-teal hover:underline">
          <ArrowLeft size={16} /> Voltar à lista
        </Link>
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-teal mb-4">
          <ArrowLeft size={16} /> Voltar à lista
        </Link>
        <Card className="p-8"><Spinner /></Card>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-teal mb-4">
          <ArrowLeft size={16} /> Voltar à lista
        </Link>
        <ErrorState message="Leilão não encontrado ou removido do e-leilões.pt" />
      </div>
    );
  }

  const item = q.data;
  const valorMinimo = item.valor_minimo ?? 0;
  const valorAvaliacao = item.valor_avaliacao ?? 0;
  const valorMercado = item.valor_mercado_estimado ?? 0;
  const descontoPct = valorAvaliacao > 0 ? ((valorAvaliacao - valorMinimo) / valorAvaliacao) * 100 : 0;
  const lancAtual = item.lance_atual ?? 0;
  const isFavorito = false; // TODO: hook up when we add favorite backend

  return (
    <article className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-teal mb-2 min-h-[40px]">
        <ArrowLeft size={16} /> Voltar à lista
      </Link>

      {/* Header card */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0" aria-hidden>
            {item.categoria === 'Imóvel' ? '🏠' :
             item.categoria === 'Veículo' ? '🚗' :
             item.categoria === 'Equipamento' ? '🔧' :
             item.categoria === 'Direito' ? '⚖️' :
             item.categoria === 'Mobiliário' ? '🪑' :
             item.categoria === 'Máquina' ? '⚙️' : '📦'}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{item.titulo}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {item.referencia} · {item.categoria}
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-600 dark:text-slate-300">
              <MapPin size={14} aria-hidden /> {item.distrito} › {item.concelho} › {item.freguesia}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <EstadoBadge estado={item.estado} dias={item.dias_ate_encerramento} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                <Tag size={12} aria-hidden /> {item.modalidade}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                {item.praca}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                Fonte: {item.fonte}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Values grid */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Valores</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Valor mínimo" value={fmtEUR.format(valorMinimo)} accent="brand-teal" />
          <Stat label="Valor de avaliação" value={fmtEUR.format(valorAvaliacao)} />
          <Stat label="Valor de mercado" value={fmtEUR.format(valorMercado)} subtitle="estimado ×1.45" />
          <Stat
            label="Desconto vs avaliação"
            value={fmtPct(descontoPct)}
            accent={descontoPct >= 30 ? 'emerald' : descontoPct >= 15 ? 'amber' : 'slate'}
          />
        </div>
      </Card>

      {/* Bid history (placeholder — API doesn't expose history; we show the current lance) */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Gavel size={16} aria-hidden /> Lance actual
        </h3>
        {lancAtual > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Stat label="Lance atual" value={fmtEUR.format(lancAtual)} accent="brand-teal" large />
            <Stat label="Próxima licitação" value="—" subtitle="não disponível" />
            <Stat label="Nº de licitadores" value="—" subtitle="não disponível" />
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            Ainda sem licitações. O leilão encontra-se na fase inicial — apenas o valor mínimo está definido.
          </p>
        )}
      </Card>

      {/* Dates */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar size={16} aria-hidden /> Datas
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase text-slate-500">Publicação</dt>
            <dd className="text-slate-700 dark:text-slate-200">{formatDate(item.data_publicacao)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Abertura</dt>
            <dd className="text-slate-700 dark:text-slate-200">{formatDate(item.data_abertura)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Encerramento</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {formatDate(item.data_encerramento)}
              {item.dias_ate_encerramento > 0 && (
                <span className="ml-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  ({item.dias_ate_encerramento}d restantes)
                </span>
              )}
              {item.dias_ate_encerramento <= 0 && item.dias_ate_encerramento > -30 && (
                <span className="ml-2 text-xs text-red-700 dark:text-red-300 font-medium">
                  (terminou há {-item.dias_ate_encerramento}d)
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Savings breakdown */}
      {item.poupanca_potencial != null && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingDown size={16} aria-hidden /> Poupança potencial
          </h3>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {fmtEUR.format(item.poupanca_potencial)}
            </span>
            {item.poupanca_pct != null && (
              <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                ({item.poupanca_pct.toFixed(1)}% abaixo do valor de avaliação)
              </span>
            )}
          </div>
        </Card>
      )}

      {/* CTA: back to original site (with caveat) */}
      <Card className="p-5 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Nota:</strong> o site original <code>e-leilões.pt</code> não suporta deep links diretos para leilões individuais
              (a sua SPA redireciona sempre para a página inicial).
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              Para licitar, abre o e-leilões.pt e procura pela referência <code className="font-mono">{item.referencia}</code>.
            </p>
            <a
              href={`https://www.e-leilões.pt/`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 min-h-[44px]"
            >
              <ExternalLink size={16} /> Abrir e-leilões.pt
            </a>
          </div>
        </div>
      </Card>
    </article>
  );
}

function Stat({ label, value, accent, subtitle, large }: {
  label: string;
  value: string;
  accent?: 'brand-teal' | 'emerald' | 'amber' | 'slate';
  subtitle?: string;
  large?: boolean;
}) {
  const colorCls = accent === 'brand-teal' ? 'text-brand-teal' :
                   accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                   accent === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                   'text-slate-700 dark:text-slate-200';
  return (
    <div>
      <p className="text-xs uppercase text-slate-500 mb-1">{label}</p>
      <p className={cx('font-semibold tabular-nums', large ? 'text-2xl' : 'text-lg', colorCls)}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EstadoBadge({ estado, dias }: { estado: string; dias?: number }) {
  let cls = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  let label = estado;
  if (estado === 'Em curso' && typeof dias === 'number') {
    if (dias > 0 && dias <= 7) {
      cls = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      label = `🔥 Encerra em ${dias}d`;
    } else if (dias > 7 && dias <= 30) {
      cls = 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
      label = `⏰ Encerra em ${dias}d`;
    } else if (dias > 30) {
      cls = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200';
      label = `✓ Aberto (encerra em ${dias}d)`;
    } else if (dias <= 0 && dias > -30) {
      cls = 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
      label = `Encerrado há ${-dias}d`;
    }
  } else if (estado === 'Terminado') {
    cls = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
  } else if (estado === 'Cancelado') {
    cls = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  }
  return (
    <span className={cx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cls)}>
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}