import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, cx } from '@/lib/ui';

type Props = {
  label: string;
  value: string;
  icon: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
  accent?: string;        // hex like '#10b981'
  description?: string;
  trend?: number[];       // sparkline values 0-100
};

export default function KPICard({ label, value, icon, delta, deltaDir = 'up', accent, description, trend }: Props) {
  return (
    <Card className="p-4 group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <span aria-hidden className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {delta && (
          <span
            className={cx(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              deltaDir === 'up'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
            )}
          >
            {deltaDir === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta}
          </span>
        )}
        {description && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
        )}
      </div>
      {trend && trend.length > 1 && (
        <Sparkline points={trend} color={accent ?? '#0F766E'} className="mt-3" />
      )}
    </Card>
  );
}

function Sparkline({ points, color, className }: { points: number[]; color: string; className?: string }) {
  const w = 120;
  const h = 32;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - ((p - min) / span) * h}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cx('w-full h-8', className)} preserveAspectRatio="none" aria-hidden>
      <path d={path} stroke={color} strokeWidth={1.5} fill="none" />
    </svg>
  );
}
