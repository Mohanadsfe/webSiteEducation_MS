import React, { createContext, useContext, useMemo, useState } from 'react';

const LanguageContext = createContext({
  lang: 'ar',
  setLang: () => {},
  t: (ar, he) => ar,
  isHe: false,
});

const STORAGE_KEY = 'ms_ui_lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'ar';
    } catch {
      return 'ar';
    }
  });

  const setLang = (next) => {
    const v = next === 'he' ? 'he' : 'ar';
    setLangState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isHe: lang === 'he',
      t: (ar, he) => (lang === 'he' ? he : ar),
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
