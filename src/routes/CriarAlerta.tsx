import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const AlertSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  distrito: z.array(z.string()).optional(),
  categoria: z.array(z.string()).optional(),
  valor_max: z.number().min(0).optional(),
});

type AlertForm = z.infer<typeof AlertSchema>;

export default function CriarAlerta() {
  const { register, handleSubmit, formState: { errors } } = useForm<AlertForm>({
    resolver: zodResolver(AlertSchema),
  });
  const onSubmit = (data: AlertForm) => {
    // TODO: POST /api/alertas
    console.log('Alert created:', data);
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Criar alerta</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium mb-1">Nome do alerta</label>
          <input
            {...register('name')}
            placeholder="Ex: Cabanas terrenos"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-900"
          />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-teal text-white font-medium">
          💾 Guardar alerta
        </button>
      </form>
    </div>
  );
}