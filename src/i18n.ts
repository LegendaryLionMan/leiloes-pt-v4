import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptPT from './locales/pt-PT.json';
import en from './locales/en.json';

const SUPPORTED = ['pt-PT', 'en'] as const;
const STORAGE_KEY = 'leiloes.lang';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-PT': { translation: ptPT },
      en: { translation: en },
    },
    fallbackLng: 'pt-PT',
    supportedLngs: SUPPORTED as unknown as string[],
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

export const SUPPORTED_LANGUAGES = SUPPORTED;
export default i18n;
