import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, Map, BarChart3, Bell, Sparkles, Sun, Moon, Menu, X, Activity } from 'lucide-react';
import Lista from './routes/Lista';
import Mapa from './routes/Mapa';
import Visualizacoes from './routes/Visualizacoes';
import CriarAlerta from './routes/CriarAlerta';
import Matches from './routes/Matches';
import Alertas from './routes/Alertas';
import { fetchCacheInfo, fetchAlertas } from './lib/api';
import { onToast, cx } from '@/lib/ui';

const tabs = [
  { to: '/', label: 'Lista', icon: Home, end: true },
  { to: '/visualizacoes', label: 'Gráficos', icon: BarChart3 },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/alertas', label: 'Alertas', icon: Bell },
  { to: '/matches', label: 'Matches', icon: Sparkles },
];

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }
    return false;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label={`Trocar para tema ${dark ? 'claro' : 'escuro'}`}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function CacheBadge() {
  const cache = useQuery({ queryKey: ['cache-info'], queryFn: fetchCacheInfo, refetchInterval: 60_000 });
  if (!cache.data) return null;
  const age = cache.data.cache_age_hours ?? 0;
  const stale = cache.data.is_stale;
  const label = age < 1 ? `${Math.round(age * 60)}min` : age < 24 ? `${Math.round(age)}h` : `${Math.round(age / 24)}d`;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
        stale ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      )}
      title={`Cache atualizado há ${label}. Fonte: ${cache.data.fonte}`}
    >
      <Activity size={12} /> {label}
    </span>
  );
}

function AlertsBell() {
  const alerts = useQuery({ queryKey: ['alertas', 'bell'], queryFn: () => fetchAlertas(true) });
  const activeCount = alerts.data?.count ?? 0;
  return (
    <span className="relative inline-flex">
      <Bell size={18} />
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
          {activeCount}
        </span>
      )}
    </span>
  );
}

function Toaster() {
  const [items, setItems] = useState<Array<{ id: number; message: string; tone: 'success' | 'error' | 'info' }>>([]);
  useEffect(() => {
    return onToast((t) => {
      setItems((cur) => [...cur, t]);
      setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== t.id)), 3500);
    });
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2" role="status" aria-live="polite">
      {items.map((it) => (
        <div
          key={it.id}
          className={cx(
            'rounded-lg px-4 py-3 shadow-lg text-sm font-medium min-w-[260px]',
            it.tone === 'success' && 'bg-emerald-600 text-white',
            it.tone === 'error' && 'bg-red-600 text-white',
            it.tone === 'info' && 'bg-slate-900 text-white',
          )}
        >
          {it.message}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();

  // Auto-close mobile nav on route change
  useEffect(() => setMobileNav(false), [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:px-3 focus:py-1.5 focus:rounded focus:shadow"
      >
        Saltar para o conteúdo principal
      </a>

      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileNav((m) => !m)}
            aria-label={mobileNav ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileNav}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl" aria-hidden>⚖️</span>
            <h1 className="text-base sm:text-lg font-semibold whitespace-nowrap">
              leiloes-pt <span className="text-brand-teal">v4</span>
            </h1>
          </div>

          <div className="hidden sm:block ml-2">
            <CacheBadge />
          </div>

          <div className="flex-1" />

          <Link
            to="/matches"
            aria-label="Ver matches"
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <AlertsBell />
          </Link>

          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav
          aria-label="Navegação principal"
          className={cx(
            'md:w-56 md:flex-shrink-0 md:relative md:translate-x-0 md:bg-white md:dark:bg-slate-900 md:border-r md:border-slate-200 md:dark:border-slate-800',
            'fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform md:transition-none',
            mobileNav ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          )}
        >
          <div className="p-3 md:pt-16">
            <ul className="space-y-1">
              {tabs.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMobileNav(false)}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[40px]',
                        isActive
                          ? 'bg-brand-teal text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                      )
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 mt-6 px-3">
              Source: e-leilões.pt · 3 068 items · MIT licensed
            </p>
          </div>
        </nav>

        {/* Backdrop for mobile nav */}
        {mobileNav && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/40 md:hidden"
            onClick={() => setMobileNav(false)}
            aria-hidden
          />
        )}

        <main id="main" className="flex-1 p-4 sm:p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Lista />} />
            <Route path="/visualizacoes" element={<Visualizacoes />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/alerta/new" element={<CriarAlerta />} />
            <Route path="/matches" element={<Matches />} />
          </Routes>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
