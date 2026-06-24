import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Settings, User, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../i18n/TranslationProvider';

interface ProfileMenuProps {
  variant?: 'navbar' | 'sidebar';
}

export const ProfileMenu = ({ variant = 'navbar' }: ProfileMenuProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, setUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user) return;

    let isMounted = true;
    authService
      .getProfile()
      .then((profile) => {
        if (isMounted) setUser(profile);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, setUser, user]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const initials = useMemo(() => getInitials(user?.name || user?.email), [user?.email, user?.name]);
  const profileIcon = (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/10 dark:text-[#8bbdff]">
      <User size={16} />
    </span>
  );
  const dropdownPosition = variant === 'sidebar' ? 'bottom-0 left-12' : 'right-0 top-12';
  const buttonClasses = variant === 'sidebar'
    ? 'flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white ring-1 ring-white/12 transition hover:bg-white/16'
    : 'flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] text-xs font-black text-[#2f80ed] transition hover:border-[#bdd5fa] hover:bg-[#eaf3ff] dark:border-white/10 dark:bg-white/5 dark:text-[#8bbdff] dark:hover:bg-white/8';

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((value) => !value)}
        className={buttonClasses}
        aria-label={t('profileMenuOpen')}
        title={t('profile')}
      >
        {user?.picture ? (
          <img src={user.picture} alt="Profile" className="h-full w-full rounded-full object-cover" />
        ) : (
          profileIcon
        )}
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-64 overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white shadow-xl shadow-[#111b3f]/12 dark:border-white/10 dark:bg-[#101d3a] ${dropdownPosition}`}>
          <div className="border-b border-[#edf1f8] p-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3ff] text-sm font-black text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#111b3f] dark:text-white">{user?.name || t('userProfile')}</p>
                <p className="truncate text-xs font-semibold text-[#64708d] dark:text-white/55">{user?.email || t('authenticatedUser')}</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#64708d] transition hover:bg-[#f5f9ff] hover:text-[#2f80ed] dark:text-white/65 dark:hover:bg-white/6 dark:hover:text-white"
            >
              <Settings size={16} />
              {t('editProfile')}
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const getInitials = (value?: string) => {
  if (!value) return <UserRound size={17} />;

  const normalized = value.includes('@') ? value.split('@')[0] : value;
  const parts = normalized.split(/[.\s_-]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return initials || 'U';
};
