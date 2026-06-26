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
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7e0ef] bg-[#f7f9fd] px-3 py-2 text-xs font-black text-[#64708d] transition hover:bg-[#eef6ff] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('common.language')}
        title={t('common.language')}
      >
        <FlagIcon locale={currentLanguage.code} size={20} />
        <span>{t(currentLanguage.labelKey)}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-[#dbe4f2] bg-white shadow-lg dark:border-white/10 dark:bg-[#0a1628] p-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              setLanguage(otherLanguage.code);
              setOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-[#eef6ff] dark:hover:bg-white/10 w-full"
            aria-label={`${t('common.switchTo')} ${t(otherLanguage.labelKey)}`}
          >
            <FlagIcon locale={otherLanguage.code} size={20} />
            <span className="text-sm font-black text-[#111b3f] dark:text-white">{t(otherLanguage.labelKey)}</span>
          </button>
        </div>
      )}
    </div>
  );
};
