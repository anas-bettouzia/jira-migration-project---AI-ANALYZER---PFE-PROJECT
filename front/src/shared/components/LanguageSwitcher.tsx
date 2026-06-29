import { useEffect, useRef, useState } from 'react';

import { useI18n, type Language } from '../../i18n';
import { FlagIcon } from './FlagIcon';

interface LanguageSwitcherProps {
  className?: string;
}

const languages: Array<{ code: Language; labelKey: string }> = [
  { code: 'en', labelKey: 'common.english' },
  { code: 'fr', labelKey: 'common.french' },
];

export const LanguageSwitcher = ({ className = '' }: LanguageSwitcherProps) => {
  const { language, setLanguage, t } = useI18n();
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

  const currentLanguage = languages.find((item) => item.code === language) ?? languages[0];
  const otherLanguage = languages.find((item) => item.code !== language) ?? currentLanguage;

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {/* Bouton principal : Uniquement le drapeau */}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex p-2 rounded-lg border border-[#d7e0ef] bg-[#f7f9fd] transition hover:bg-[#eef6ff] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('common.language')}
        title={t(currentLanguage.labelKey)}
      >
        <FlagIcon locale={currentLanguage.code} size={24} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[#dbe4f2] bg-white shadow-lg dark:border-white/10 dark:bg-[#0a1628] p-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              setLanguage(otherLanguage.code);
              setOpen(false);
            }}
            className="inline-flex items-center gap-3 rounded-lg pl-2 pr-4 py-2 transition hover:bg-[#eef6ff] dark:hover:bg-white/10 w-full"
            aria-label={`${t('common.switchTo')} ${t(otherLanguage.labelKey)}`}
          >
            {/* Drapeau parfaitement aligné sous le premier */}
            <FlagIcon locale={otherLanguage.code} size={24} />
            
            {/* Style du texte ajusté pour correspondre à votre image */}
            <span className="text-base font-bold text-[#64708d] dark:text-white/80">
              {t(otherLanguage.labelKey)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};