import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart3, Boxes, Gauge } from 'lucide-react';

import { ProfileMenu } from './ProfileMenu';
import { useI18n } from '../../i18n';
import spectrumMark from '../../assets/img/cropped-favicon-spectrumgroupe.png';

type MainSidebarPage = 'overview' | 'analysis' | 'reports';

interface MainSidebarProps {
  activePage: MainSidebarPage;
}

export const MainSidebar: React.FC<MainSidebarProps> = ({ activePage }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col items-center border-r border-white/10 bg-[#101b49] py-4 text-white shadow-2xl shadow-[#101b49]/25 md:flex pointer-events-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-9 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10 ring-1 ring-white/20 transition hover:scale-105"
          aria-label={t('sidebar.goHome')}
          title={t('sidebar.goHome')}
        >
          <img src={spectrumMark} alt="Spectrum Groupe" className="h-8 w-8 object-contain" />
        </button>

        <nav className="flex flex-1 flex-col items-center gap-3 text-[9px] font-semibold text-white/48">
          <MainSidebarItem icon={<Boxes size={17} />} label={t('sidebar.overview')} active={activePage === 'overview'} to="/" />
          <MainSidebarItem icon={<Gauge size={17} />} label={t('sidebar.aiAnalysis')} active={activePage === 'analysis'} to="/analysis" />
          <MainSidebarItem icon={<BarChart3 size={17} />} label={t('sidebar.reports')} active={activePage === 'reports'} to="/reports" />
        </nav>
        <div className="mb-4">
          <ProfileMenu variant="sidebar" />
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between rounded-3xl border border-white/12 bg-[#101b49]/96 px-3 py-2 text-white shadow-2xl shadow-[#101b49]/30 backdrop-blur md:hidden pointer-events-auto">
        <MobileSidebarItem icon={<Boxes size={18} />} label={t('sidebar.overview')} active={activePage === 'overview'} to="/" />
        <MobileSidebarItem icon={<Gauge size={18} />} label={t('sidebar.aiAnalysis')} active={activePage === 'analysis'} to="/analysis" />
        <MobileSidebarItem icon={<BarChart3 size={18} />} label={t('sidebar.reports')} active={activePage === 'reports'} to="/reports" />
        <ProfileMenu variant="mobile" />
      </nav>
    </>
  );
};

const MainSidebarItem = ({ icon, label, active, onClick, to }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void; to?: string }) => {
  const baseClass = `group relative flex w-14 flex-col items-center gap-1 rounded-2xl py-2.5 transition ${
    active
      ? 'bg-white/10 text-white ring-1 ring-white/12'
      : 'text-white/45 hover:bg-white/6 hover:text-white/85'
  }`;

  const innerIconClass = `flex h-7 w-7 items-center justify-center rounded-xl transition ${active ? 'bg-[#2f80ed] text-white shadow-lg shadow-[#2f80ed]/25' : 'group-hover:bg-white/8'}`;

    if (to) {
    return (
      <Link to={to} className={baseClass} onClick={() => console.debug('MainSidebar link click', to)}>
        {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#2f80ed]" />}
        <span className={innerIconClass}>{icon}</span>
        <span className="leading-none">{label}</span>
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={baseClass}
    >
      {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#2f80ed]" />}
      <span className={innerIconClass}>{icon}</span>
      <span className="leading-none">{label}</span>
    </button>
  );
};

const MobileSidebarItem = ({ icon, label, active, onClick, to }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void; to?: string }) => {
  const base = `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition ${active ? 'bg-white/12 text-white' : 'text-white/52 hover:bg-white/8 hover:text-white'}`;
  const iconClass = `flex h-8 w-8 items-center justify-center rounded-xl transition ${active ? 'bg-[#2f80ed] text-white shadow-lg shadow-[#2f80ed]/25' : ''}`;

  if (to) {
    return (
      <Link to={to} className={base} onClick={() => console.debug('MobileSidebar link click', to)}>
        <span className={iconClass}>{icon}</span>
        <span className="max-w-full truncate leading-none">{label}</span>
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={base}>
      <span className={iconClass}>{icon}</span>
      <span className="max-w-full truncate leading-none">{label}</span>
    </button>
  );
};
