import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LOCALE_LABELS, LOCALE_STORAGE_KEY, LOCALE_NAMES, SUPPORTED_LOCALES, detectBrowserLocale, getSavedLocale, Locale, messages, TranslationKey } from './translations';

interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  availableLocales: readonly Locale[];
  localeLabels: Record<Locale, string>;
  localeNames: Record<Locale, string>;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(() => getSavedLocale() ?? detectBrowserLocale());

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey) => messages[locale][key] ?? key,
      availableLocales: SUPPORTED_LOCALES,
      localeLabels: LOCALE_LABELS,
      localeNames: LOCALE_NAMES,
    }),
    [locale],
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslation = (): TranslationContextValue => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};
