import { useTranslation } from '../../i18n/TranslationProvider';
import { useEffect, useRef, useState } from 'react';
import { FlagIcon } from './FlagIcon';

interface LocaleSwitcherProps {
  className?: string;
}

export const LocaleSwitcher = ({ className = '' }: LocaleSwitcherProps) => {
  const { locale, setLocale, availableLocales, localeLabels, localeNames, t } = useTranslation();
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
    <div ref={ref} className={`relative ${className}`}>
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
        <div className="absolute right-0 top-full z-50 mt-2 rounded-lg border border-[#dbe4f2] bg-white shadow-lg dark:border-white/10 dark:bg-[#0a1628] p-1">
          <button
            type="button"
            onClick={() => handleSelect(otherLocale)}
            className="inline-flex items-center justify-center p-2 transition hover:bg-[#eef6ff] dark:hover:bg-white/10 rounded-lg"
            aria-label={`${t('switchTo')} ${localeNames[otherLocale] ?? localeLabels[otherLocale]}`}
          >
            <FlagIcon locale={otherLocale as 'en' | 'fr'} size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
