import { en, type Dictionary } from './dictionaries/en';
import { es } from './dictionaries/es';

export type Locale = 'en' | 'es';

export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}

export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  // Check localStorage first (user preference)
  const saved = localStorage.getItem('digis_locale');
  if (saved && saved in dictionaries) return saved as Locale;

  // Check browser language
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && browserLang in dictionaries) return browserLang as Locale;

  return 'en';
}

export type { Dictionary };
