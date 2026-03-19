'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getDictionary, detectLocale, type Locale, type Dictionary } from '@/lib/i18n';

interface LanguageContextType {
  locale: Locale;
  setLocale: (_locale: Locale) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [t, setDictionary] = useState<Dictionary>(getDictionary('en'));

  // Detect locale on mount
  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    setDictionary(getDictionary(detected));
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    localStorage.setItem('digis_locale', newLocale);

    // Update document lang attribute
    document.documentElement.lang = newLocale;
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
