'use client';

import { useLanguage } from '@/context/LanguageContext';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';
import { Check } from 'lucide-react';

export function LanguageSection() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">{t.settings.languageDesc}</p>
      <div className="space-y-2">
        {SUPPORTED_LOCALES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLocale(lang.code as Locale)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
              locale === lang.code
                ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-medium flex-1 text-left">{lang.label}</span>
            {locale === lang.code && (
              <Check className="w-5 h-5 text-cyan-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
