import { useQuery } from '@tanstack/react-query';
import { Sparkles, ExternalLink } from 'lucide-react';
import { fetchAllMatches } from '@/lib/api';
import { Card, EmptyState, ErrorState, Spinner, categoryEmoji, formatEUR, formatPct, urgencyBadge, cx } from '@/lib/ui';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Matches() {
  const { t } = useTranslation();
  const matches = useQuery({ queryKey: ['matches', 'active'], queryFn: () => fetchAllMatches(true) });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={24} className="text-amber-500" /> Matches
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("ui.matches_summary_caption")}al.
          </p>
        </div>
        <Link
          to="/alerta/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] text-sm font-medium transition-colors"
        >
          Criar novo alerta
        </Link>
      </header>

      {matches.isLoading && <div className="flex justify-center p-12"><Spinner /></div>}
      {matches.isError && <ErrorState message="Falha a avaliar matches" onRetry={() => matches.refetch()} />}

      {matches.data && matches.data.items.length === 0 && (
        <EmptyState icon="🎯" title="Nenhum alerta ativo. Cria um em /alerta/new." action={
          <Link to="/alerta/new" className="text-sm font-medium text-brand-teal hover:underline">Criar alerta →</Link>
        } />
      )}

      {matches.data && matches.data.items.length > 0 && matches.data.items.every((m) => m.matches.length === 0) && (
        <EmptyState icon="🪺" title="Nenhum match. Ajusta filtros ou valores dos teus alertas." />
      )}

      {matches.data && matches.data.items.map((block) => (
        block.matches.length > 0 && (
          <section key={block.alert.id} className="space-y-3">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">🔔 {block.alert.name}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {block.matches.length} {block.matches.length === 1 ? 'item' : 'itens'} correspondentes
                </p>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {block.matches.slice(0, 12).map((m) => (
                <Card key={m.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-2">
                    <span aria-hidden className="text-2xl">{categoryEmoji(m.categoria)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{m.titulo}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {m.distrito} · {m.concelho}
                      </p>
                      {m.valor_minimo != null && (
                        <p className="text-sm font-bold tabular-nums mt-1">{formatEUR(m.valor_minimo, { compact: true })}</p>
                      )}
                      {m.poupanca_pct != null && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          −{formatPct(m.poupanca_pct, 1)} · {formatEUR(m.poupanca_potencial, { compact: true })}
                        </p>
                      )}
                      <UrgencyInline days={m.dias_ate_encerramento} />
                    </div>
                  </div>
                  {m.link && (
                    <a href={m.link} target="_blank" rel="noopener noreferrer"
                       className="mt-2 inline-flex items-center gap-1 text-xs text-brand-teal hover:underline min-h-[36px]">
                      {t("ui.open_at_source")} <ExternalLink size={12} />
                    </a>
                  )}
                </Card>
              ))}
            </div>
            {block.matches.length > 12 && (
              <p className="text-xs text-slate-500 text-center">
                +{block.matches.length - 12} items adicionais neste alerta — vê a <Link to="/alertas" className="text-brand-teal hover:underline">lista de alertas</Link>
              </p>
            )}
          </section>
        )
      ))}
    </div>
  );
}

function UrgencyInline({ days }: { days: number | undefined | null }) {
  const u = urgencyBadge(days);
  if (u.label === '—') return null;
  const tones = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    teal: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  } as const;
  return (
    <span className={cx('inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1', tones[u.tone as keyof typeof tones])}>
      {u.label}
    </span>
  );
}
