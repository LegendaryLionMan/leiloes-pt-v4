import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

const LABELS: Record<string, string> = {
  'pt-PT': 'PT',
  en: 'EN',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'pt-PT';

  const onChange = (lng: string) => {
    void i18n.changeLanguage(lng);
    try {
      localStorage.setItem('leiloes.lang', lng);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      role="group"
      aria-label="Idioma"
      data-testid="language-switcher"
      className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs font-semibold"
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = current === lng;
        return (
          <button
            key={lng}
            type="button"
            data-testid={`lang-${lng}`}
            data-active={active}
            onClick={() => onChange(lng)}
            aria-pressed={active}
            className={
              'px-2 py-1 transition-colors ' +
              (active
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
            }
          >
            {LABELS[lng] ?? lng}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
