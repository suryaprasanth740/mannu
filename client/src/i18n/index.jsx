import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import kn from './kn.js';
import ta from './ta.js';
import te from './te.js';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕ' },
  { code: 'ta', label: 'தமிழ்', short: 'த' },
  { code: 'te', label: 'తెలుగు', short: 'తె' },
];

const DICTS = { en, kn, ta, te };
const STORAGE_KEY = 'mannu_lang';

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!DICTS[code]) return;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = DICTS[lang][key] ?? en[key] ?? key;
      if (vars && typeof s === 'string') {
        for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
      }
      return s;
    },
    [lang]
  );

  /** Pick the local-language name of a product or category, falling back to English. */
  const ln = useCallback((obj) => {
    if (!obj) return '';
    if (lang !== 'en' && obj.localNames?.[lang]) return obj.localNames[lang];
    return obj.name;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, ln }), [lang, setLang, t, ln]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  return useContext(LanguageContext);
}
