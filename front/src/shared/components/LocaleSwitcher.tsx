import { useI18n } from '../../i18n/index.tsx';
import { LOCALE_LABELS, LOCALE_NAMES, SUPPORTED_LOCALES } from '../../i18n/translations.ts';
import { useEffect, useRef, useState } from 'react';
import { FlagIcon } from './FlagIcon';

interface LocaleSwitcherProps {
  className?: string;
}

export const LocaleSwitcher = ({ className = '' }: LocaleSwitcherProps) => {
  const { language: locale, setLanguage: setLocale, t } = useI18n();
  const availableLocales = SUPPORTED_LOCALES;
  const localeLabels = LOCALE_LABELS;
  const localeNames = LOCALE_NAMES;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const handleSelect = (l: string) => {
    setLocale(l as any);
    setOpen(false);
  };

  // Get the other locale (not current)
  const otherLocale = availableLocales.find((l) => l !== locale) ?? locale;

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center justify-center p-2 rounded-lg border border-[#d7e0ef] bg-[#f7f9fd] transition hover:bg-[#eef6ff] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('localeToggle')}
        title={localeNames ? localeNames[locale] : localeLabels[locale]}
      >
        <FlagIcon locale={locale as 'en' | 'fr'} size={24} />
      </button>

      {open && (
        /* Changement ici : "left-0" aligne le bord gauche du dropdown sur le bord gauche du bouton */
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[#dbe4f2] bg-white shadow-lg dark:border-white/10 dark:bg-[#0a1628] p-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => handleSelect(otherLocale)}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 transition hover:bg-[#eef6ff] dark:hover:bg-white/10 w-full"
            aria-label={`${t('switchTo')} ${localeNames[otherLocale] ?? localeLabels[otherLocale]}`}
          >
            <FlagIcon locale={otherLocale as 'en' | 'fr'} size={20} />
            <span className="text-sm font-black text-[#111b3f] dark:text-white">
              {localeNames[otherLocale] ?? localeLabels[otherLocale]}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};