import { Routes, Route, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, Map, BarChart3, Trophy, Bell, Sparkles, Sun, Moon } from 'lucide-react';
import Lista from './routes/Lista';
import Mapa from './routes/Mapa';
import Visualizacoes from './routes/Visualizacoes';
import Top from './routes/Top';
import CriarAlerta from './routes/CriarAlerta';
import Matches from './routes/Matches';

const tabs = [
  { to: '/', label: 'Lista', icon: Home, end: true },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/visualizacoes', label: 'Visualizações', icon: BarChart3 },
  { to: '/top', label: 'Top', icon: Trophy },
  { to: '/alerta/new', label: 'Criar alerta', icon: Bell },
  { to: '/matches', label: 'Matches', icon: Sparkles },
];

function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label="Alternar tema"
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚖️</span>
          <h1 className="text-lg font-semibold">leiloes-pt v4</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-1">
        <nav className="w-56 border-r border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
          <ul className="space-y-1">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-teal text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Lista />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/visualizacoes" element={<Visualizacoes />} />
            <Route path="/top" element={<Top />} />
            <Route path="/alerta/new" element={<CriarAlerta />} />
            <Route path="/matches" element={<Matches />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}