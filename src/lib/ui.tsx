import { type ReactNode } from 'react';

// ============================================================
// Brand primitives — every component reads from these tokens.
// (gem-design-md-guidelines: no inline raw colors)
// ============================================================

export const BRAND_TEAL = '#0F766E';
export const BRAND_TEAL_LIGHT = '#14b8a6';
export const SAVINGS = '#10b981';   // green
export const URGENT = '#f59e0b';     // amber
export const INFO = '#3b82f6';       // blue

// Categories → emoji + label (PT)
export const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  Imóvel: { emoji: '🏠', label: 'Imóvel' },
  Veículo: { emoji: '🚗', label: 'Veículo' },
  Direito: { emoji: '⚖️', label: 'Direito' },
  Equipamento: { emoji: '🛠️', label: 'Equipamento' },
  Máquina: { emoji: '⚙️', label: 'Máquina' },
  Mobiliário: { emoji: '🪑', label: 'Mobiliário' },
};

export function categoryEmoji(cat: string | undefined): string {
  if (!cat) return '📦';
  return CATEGORY_META[cat]?.emoji ?? '📦';
}

// Format EUR currency in PT locale
export function formatEUR(v: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (v === null || v === undefined) return '—';
  if (opts.compact && Math.abs(v) >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  }
  if (opts.compact && Math.abs(v) >= 1_000) {
    return `${(v / 1_000).toFixed(0)} k€`;
  }
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pt-PT');
}

export function formatPct(p: number | null | undefined, digits = 1): string {
  if (p === null || p === undefined) return '—';
  return `${p.toFixed(digits).replace('.', ',')}%`;
}

// Days-until countdown — colored urgency
export function urgencyBadge(days: number | undefined | null) {
  if (days === undefined || days === null) return { tone: 'slate' as const, label: '—' };
  if (days < 0) return { tone: 'slate' as const, label: 'encerrado' };
  if (days <= 3) return { tone: 'red' as const, label: `⏰ ${days}d` };
  if (days <= 7) return { tone: 'orange' as const, label: `⏰ ${days}d` };
  if (days <= 30) return { tone: 'amber' as const, label: `⏰ ${days}d` };
  return { tone: 'teal' as const, label: `${days}d` };
}

export function isNovos24h(it: { data_publicacao?: string }): boolean {
  if (!it.data_publicacao) return false;
  const pub = new Date(it.data_publicacao);
  if (isNaN(pub.getTime())) return false;
  return Date.now() - pub.getTime() < 24 * 60 * 60 * 1000;
}

// cx: tiny classnames helper
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ============================================================
// Shared UI building blocks
// ============================================================

export function Card({ children, className, style }: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className={cx(
      'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm',
      className,
    )}>
      {children}
    </div>
  );
}

export function Pill({
  emoji,
  label,
  active,
  onClick,
  tone = 'slate',
}: {
  emoji?: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  tone?: 'slate' | 'teal' | 'amber' | 'green' | 'red' | 'indigo';
}) {
  const tones = {
    slate: active ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    teal: active ? 'bg-brand-teal text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-brand-teal border-brand-teal/40',
    amber: active ? 'bg-amber-500 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-amber-600 border-amber-400',
    green: active ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-emerald-600 border-emerald-400',
    red: active ? 'bg-red-500 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-red-600 border-red-400',
    indigo: active ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white dark:bg-slate-900 text-indigo-600 border-indigo-400',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={cx(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors min-h-[36px]',
        tones[tone],
      )}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md', className)} />;
}

export function EmptyState({ icon = '📋', title, action }: { icon?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 gap-3 text-slate-500 dark:text-slate-400">
      <span className="text-4xl" aria-hidden>{icon}</span>
      <p className="text-base font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 flex items-center justify-between">
      <p className="text-sm text-red-800 dark:text-red-300">⚠️ {message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx('inline-block animate-spin rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-brand-teal h-4 w-4', className)} />
  );
}

// Simple toast — uses portal-like manual mount
type ToastItem = { id: number; message: string; tone: 'success' | 'error' | 'info' };
const toastListeners: ((t: ToastItem) => void)[] = [];
export function toast(message: string, tone: ToastItem['tone'] = 'success') {
  const id = Date.now() + Math.random();
  toastListeners.forEach((fn) => fn({ id, message, tone }));
}
export function onToast(fn: (t: ToastItem) => void) {
  toastListeners.push(fn);
  return () => {
    const i = toastListeners.indexOf(fn);
    if (i >= 0) toastListeners.splice(i, 1);
  };
}
