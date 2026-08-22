import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Save } from 'lucide-react';
import { createAlerta, fetchFacets } from '@/lib/api';
import { Card, ErrorState, Spinner, toast } from '@/lib/ui';

const AlertSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(80, 'Nome demasiado longo'),
  distrito: z.array(z.string()).default([]),
  concelho: z.array(z.string()).default([]),
  categoria: z.array(z.string()).default([]),
  valor_max: z.coerce.number().min(0, 'Valor mínimo').optional().or(z.literal('')),
  desconto_min: z.coerce.number().min(0).max(100, '0-100').optional().or(z.literal('')),
  texto_livre: z.string().optional(),
  only_novos_24h: z.boolean().default(false),
  active: z.boolean().default(true),
});

type AlertForm = z.infer<typeof AlertSchema>;

export default function CriarAlerta() {
  const qc = useQueryClient();
  const facets = useQuery({ queryKey: ['facets'], queryFn: fetchFacets });
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<AlertForm>({
    resolver: zodResolver(AlertSchema),
    defaultValues: {
      distrito: [], concelho: [], categoria: [], only_novos_24h: false, active: true, name: '',
    },
  });

  const districtos = watch('distrito') ?? [];
  const categorias = watch('categoria') ?? [];

  const create = useMutation({
    mutationFn: (data: AlertForm) => createAlerta({
      name: data.name,
      distrito: data.distrito,
      concelho: data.concelho || [],
      categoria: data.categoria,
      valor_max: data.valor_max === '' ? null : (data.valor_max ? Number(data.valor_max) : null),
      desconto_min: data.desconto_min === '' ? null : (data.desconto_min ? Number(data.desconto_min) : null),
      texto_livre: data.texto_livre || null,
      only_novos_24h: data.only_novos_24h,
      active: data.active,
    }),
    onSuccess: () => {
      toast('Alerta criado ✅');
      qc.invalidateQueries({ queryKey: ['alertas'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      reset({
        distrito: [], categoria: [], only_novos_24h: false, active: true, name: '',
      });
    },
    onError: (e) => toast(`Erro: ${e}`, 'error'),
  });

  const onSubmit = (data: AlertForm) => create.mutate(data);

  const toggleList = (field: 'distrito' | 'categoria', value: string) => {
    const cur = (watch(field) as string[] | undefined) ?? [];
    setValue(field, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value], { shouldDirty: true });
  };

  const erros = useMemo(() => Object.entries(errors).filter(([_, e]) => !!e?.message), [errors]);

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Bell size={24} /> Criar alerta</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Receba matches contra o scope atual (3 068 leilões) sempre que executar.
        </p>
      </header>

      {create.isError && <ErrorState message="Não foi possível criar o alerta" onRetry={() => create.reset()} />}

      <Card className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <Field label="Nome do alerta" error={errors.name?.message}>
            <input
              type="text"
              {...register('name')}
              placeholder="Ex: Cabanas terrenos baratos"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              aria-invalid={!!errors.name}
            />
          </Field>

          {/* Distrito */}
          <Field label="Distritos">
            {facets.isLoading ? <Spinner /> : (
              <div className="flex flex-wrap gap-1.5">
                {facets.data?.distritos.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleList('distrito', d)}
                    aria-pressed={districtos.includes(d)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors min-h-[36px] ${
                      districtos.includes(d)
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {/* Categoria */}
          <Field label="Categorias">
            {facets.isLoading ? <Spinner /> : (
              <div className="flex flex-wrap gap-1.5">
                {facets.data?.categorias.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleList('categoria', c)}
                    aria-pressed={categorias.includes(c)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors min-h-[36px] ${
                      categorias.includes(c)
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor máximo (€)" error={errors.valor_max?.message}>
              <input
                type="number"
                min="0"
                step="1000"
                {...register('valor_max')}
                placeholder="sem limite"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </Field>
            <Field label="Desconto mínimo (%)" error={errors.desconto_min?.message}>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                {...register('desconto_min')}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </Field>
          </div>

          <Field label="Texto livre">
            <input
              type="text"
              {...register('texto_livre')}
              placeholder="palavras-chave (ex: terreno, armazém)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('only_novos_24h')} className="accent-brand-teal" />
            Apenas leilões publicados nas últimas 24 horas
          </label>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={create.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 disabled:opacity-40 min-h-[44px] transition-colors"
            >
              {create.isPending ? <Spinner /> : <Save size={16} />}
              {create.isPending ? 'A guardar…' : 'Guardar alerta'}
            </button>
            {erros.length > 0 && (
              <p className="text-xs text-red-600">
                {erros.map(([k, e]) => `${k}: ${e?.message}`).join(' · ')}
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
