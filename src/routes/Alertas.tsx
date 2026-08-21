import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import { deleteAlerta, fetchAlertas, fetchAllMatches, toggleAlerta } from '@/lib/api';
import { Card, EmptyState, ErrorState, Spinner, cx, toast } from '@/lib/ui';
import { Link } from 'react-router-dom';

export default function Alertas() {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const alerts = useQuery({
    queryKey: ['alertas', 'page'],
    queryFn: () => fetchAlertas(false),
  });
  const matches = useQuery({
    queryKey: ['matches', showInactive ? 'all' : 'active'],
    queryFn: () => fetchAllMatches(!showInactive),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => toggleAlerta(id),
    onSuccess: () => {
      toast('Alerta atualizado');
      qc.invalidateQueries({ queryKey: ['alertas'] });  // invalidates BOTH 'bell' + 'page'
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAlerta(id),
    onSuccess: () => {
      toast('Alerta removido');
      qc.invalidateQueries({ queryKey: ['alertas'] });  // invalidates BOTH 'bell' + 'page'
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={24} className="text-brand-teal" /> Alertas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {alerts.data?.count ?? '…'} alertas · {matches.data?.items.reduce((s, m) => s + m.matches.length, 0) ?? '…'} matches totais
          </p>
        </div>
        <Link
          to="/alerta/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 min-h-[44px] transition-colors"
        >
          <Bell size={16} /> Novo alerta
        </Link>
      </header>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="accent-brand-teal"
        />
        Mostrar alertas inativos
      </label>

      {alerts.isLoading && <div className="flex justify-center p-12"><Spinner /></div>}
      {alerts.isError && <ErrorState message="Falha a carregar alertas" onRetry={() => alerts.refetch()} />}

      {alerts.data && alerts.data.items.length === 0 && (
        <EmptyState icon="🔕" title="Sem alertas" action={
          <Link to="/alerta/new" className="text-sm font-medium text-brand-teal hover:underline">Criar o primeiro →</Link>
        } />
      )}

      {alerts.data && alerts.data.items.length > 0 && (
        <div className="space-y-3">
          {alerts.data.items.map((a) => {
            const m = matches.data?.items.find((x) => x.alert.id === a.id);
            const n = m?.matches.length ?? 0;
            return (
              <Card key={a.id} className={cx(
                'p-4 flex items-center gap-3 flex-wrap',
                !a.active && 'opacity-60',
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span aria-hidden className="text-xl">{a.active ? '🔔' : '🔕'}</span>
                    <p className="font-medium truncate">{a.name}</p>
                    {!a.active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">inativo</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {a.distrito.length > 0 && `${a.distrito.join(', ')}`}
                    {a.distrito.length > 0 && a.categoria.length > 0 && ' · '}
                    {a.categoria.length > 0 && a.categoria.join(', ')}
                    {a.valor_max != null && ` · até ${a.valor_max.toLocaleString('pt-PT')} €`}
                    {a.desconto_min != null && ` · ≥ ${a.desconto_min}% desconto`}
                  </p>
                  <p className="text-xs mt-1">
                    <Link to="/matches" className="text-brand-teal hover:underline font-medium">
                      {n} {n === 1 ? 'match' : 'matches'} → ver
                    </Link>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle.mutate(a.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[36px]"
                    aria-label={a.active ? 'Desativar' : 'Ativar'}
                  >
                    {a.active ? <BellOff size={14} /> : <Bell size={14} />}
                    {a.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Apagar alerta "${a.name}"?`)) remove.mutate(a.id);
                    }}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label="Apagar alerta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
