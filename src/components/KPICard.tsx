interface Props {
  label: string;
  value: string;
  delta?: string;
  icon?: string;
  accent?: string;
}

export default function KPICard({ label, value, delta, icon, accent }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-brand-teal hover:shadow-md">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
        {icon && <span className="mr-1.5">{icon}</span>}
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      {delta && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{delta}</div>}
    </div>
  );
}