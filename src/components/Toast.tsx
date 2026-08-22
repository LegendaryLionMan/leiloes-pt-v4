import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Toast global — consome eventos 'toast' do window + state local.
 *
 * Tipos: 'success' | 'error' | 'info'
 * Auto-dismiss em 5s (success/info) ou 8s (error)
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastEvent {
  message: string;
  tone: ToastTone;
  durationMs?: number;
}

let toastIdCounter = 0;

export function emitToast(detail: ToastEvent) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:toast', { detail }));
  }
}

export function ToastContainer() {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<(ToastEvent & { id: number })[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const ev = e as CustomEvent<ToastEvent>;
      const id = ++toastIdCounter;
      const t = { ...ev.detail, id };
      setToasts((prev) => [...prev, t]);
      const duration = t.durationMs ?? (t.tone === 'error' ? 8000 : 5000);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, duration);
    }
    window.addEventListener('app:toast', handler as EventListener);
    return () => window.removeEventListener('app:toast', handler as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={t("ui.notifications")}
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md"
    >
      {toasts.map((t) => {
        const toneCls =
          t.tone === 'success'
            ? 'bg-emerald-600 text-white border-emerald-700'
            : t.tone === 'error'
            ? 'bg-rose-600 text-white border-rose-700'
            : 'bg-slate-700 text-white border-slate-800';
        const icon = t.tone === 'success' ? '✓' : t.tone === 'error' ? '✕' : 'ⓘ';
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
            className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg border ${toneCls} animate-in slide-in-from-right`}
          >
            <span aria-hidden className="font-bold text-lg leading-none mt-0.5">{icon}</span>
            <span className="flex-1 text-sm">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
