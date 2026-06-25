import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LOCALE_LABELS, LOCALE_STORAGE_KEY, LOCALE_NAMES, SUPPORTED_LOCALES, detectBrowserLocale, getSavedLocale, messages } from './translations';
import { translateText } from './translationApi';
import type { Locale, TranslationKey } from './translations';

type TranslationParams = Record<string, string | number>;

interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  translate: (text: string, sourceLocale?: Locale) => Promise<string>;
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
      t: (key: TranslationKey, params: TranslationParams = {}) => {
        const template = (messages[locale] as Record<TranslationKey, string>)[key] ?? messages.en[key] ?? key;
        return Object.entries(params).reduce(
          (current, [paramKey, paramValue]) =>
            current.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
          template,
        );
      },
      translate: async (text: string, sourceLocale: Locale = 'en') => {
        try {
          return await translateText(text, locale, sourceLocale);
        } catch (error) {
          console.warn('Translation failed, returning original text.', error);
          return text;
        }
      },
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
