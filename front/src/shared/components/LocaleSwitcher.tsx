import { useTranslation } from '../../i18n/TranslationProvider';

interface LocaleSwitcherProps {
  className?: string;
}

export const LocaleSwitcher = ({ className = '' }: LocaleSwitcherProps) => {
  const { locale, setLocale, availableLocales, localeLabels, t } = useTranslation();

  return (
    <div className={`flex items-center gap-2 rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] px-2 py-2 text-xs font-black text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70 ${className}`}>
      <span className="hidden sm:inline">{t('localeLabel')}:</span>
      {availableLocales.map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => setLocale(candidate)}
          className={`rounded-md px-2 py-1 transition ${locale === candidate ? 'bg-[#2f80ed] text-white' : 'text-[#64708d] dark:text-white/70'}`}
          aria-label={`${t('localeLabel')}: ${localeLabels[candidate]}`}
        >
          {localeLabels[candidate]}
        </button>
      ))}
    </div>
  );
};
