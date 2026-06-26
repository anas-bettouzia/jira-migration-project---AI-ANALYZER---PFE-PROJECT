import React from 'react';
import { useNavigate } from 'react-router-dom';
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-white/10 bg-[#101b49] py-4 text-white shadow-2xl shadow-[#101b49]/25 md:flex">
      <button
        onClick={() => navigate('/')}
        className="mb-9 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10 ring-1 ring-white/20 transition hover:scale-105"
        aria-label={t('sidebar.goHome')}
        title={t('sidebar.goHome')}
      >
        <img src={spectrumMark} alt="Spectrum Groupe" className="h-8 w-8 object-contain" />
      </button>

      <nav className="flex flex-1 flex-col items-center gap-3 text-[9px] font-semibold text-white/48">
        <MainSidebarItem icon={<Boxes size={17} />} label={t('sidebar.overview')} active={activePage === 'overview'} onClick={() => navigate('/')} />
        <MainSidebarItem icon={<Gauge size={17} />} label={t('sidebar.aiAnalysis')} active={activePage === 'analysis'} onClick={() => navigate('/analysis')} />
        <MainSidebarItem icon={<BarChart3 size={17} />} label={t('sidebar.reports')} active={activePage === 'reports'} />
      </nav>
      <div className="mb-4">
        <ProfileMenu variant="sidebar" />
      </div>
    </aside>
  );
};

const MainSidebarItem = ({ icon, label, active, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`group relative flex w-14 flex-col items-center gap-1 rounded-2xl py-2.5 transition ${
      active
        ? 'bg-white/10 text-white ring-1 ring-white/12'
        : 'text-white/45 hover:bg-white/6 hover:text-white/85'
    }`}
  >
    {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#2f80ed]" />}
    <span className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${active ? 'bg-[#2f80ed] text-white shadow-lg shadow-[#2f80ed]/25' : 'group-hover:bg-white/8'}`}>
      {icon}
    </span>
    <span className="leading-none">{label}</span>
  </button>
);