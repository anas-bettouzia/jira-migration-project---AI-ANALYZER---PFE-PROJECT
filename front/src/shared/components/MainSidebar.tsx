import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Gauge, Home } from 'lucide-react';

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
      <aside className="pointer-events-auto fixed inset-y-0 left-0 z-50 hidden w-[88px] flex-col items-center border-r border-white/10 bg-[#0d1740] px-3 py-4 text-white shadow-2xl shadow-[#071126]/35 md:flex">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(47,128,237,0.18),transparent)]" />
        <button
          onClick={() => navigate('/')}
          className="relative flex h-14 w-14 items-center justify-center rounded-[20px] bg-white shadow-lg shadow-black/10 ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:shadow-blue-500/20"
          aria-label={t('sidebar.goHome')}
          title={t('sidebar.goHome')}
        >
          <img src={spectrumMark} alt="Spectrum Groupe" className="h-10 w-10 object-contain" />
        </button>

        <span className="mt-5 h-px w-10 bg-white/10" />

        <nav className="mt-7 flex flex-col items-center gap-3">
          <MainSidebarItem icon={<Home size={18} />} label={t('sidebar.overview')} active={activePage === 'overview'} to="/" />
          <MainSidebarItem icon={<Gauge size={17} />} label={t('sidebar.aiAnalysis')} active={activePage === 'analysis'} to="/analysis" />
          <MainSidebarItem icon={<FileText size={17} />} label={t('sidebar.reports')} active={activePage === 'reports'} to="/reports" />
        </nav>

        <div className="mt-auto mb-3 flex flex-col items-center gap-3">
          <div className="rounded-[20px] bg-white/[0.04] p-1.5 ring-1 ring-white/8">
            <ProfileMenu variant="sidebar" />
          </div>
        </div>
      </aside>

      <nav className="pointer-events-auto fixed inset-x-3 bottom-3 z-50 flex items-center justify-between rounded-3xl border border-white/12 bg-[#101b49]/96 px-3 py-2 text-white shadow-2xl shadow-[#101b49]/30 backdrop-blur md:hidden">
        <MobileSidebarItem icon={<Home size={18} />} label={t('sidebar.overview')} active={activePage === 'overview'} to="/" />
        <MobileSidebarItem icon={<Gauge size={18} />} label={t('sidebar.aiAnalysis')} active={activePage === 'analysis'} to="/analysis" />
        <MobileSidebarItem icon={<FileText size={18} />} label={t('sidebar.reports')} active={activePage === 'reports'} to="/reports" />
        <ProfileMenu variant="mobile" />
      </nav>
    </>
  );
};

const MainSidebarItem = ({ icon, label, active, onClick, to }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void; to?: string }) => {
  const baseClass = `group relative flex items-center justify-center rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-[#8bbdff]/45 ${
    active
      ? 'h-16 w-16 flex-col gap-1.5 bg-[#2f80ed] text-white shadow-lg shadow-[#2f80ed]/25 ring-1 ring-[#8bbdff]/40'
      : 'h-12 w-12 text-white/45 hover:bg-white/8 hover:text-white'
  }`;

  const tooltipClass = 'pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-[#101b49] px-3 py-2 text-xs font-black text-white opacity-0 shadow-xl shadow-[#071126]/30 transition group-hover:translate-x-1 group-hover:opacity-100';

    if (to) {
    return (
      <Link to={to} className={baseClass} aria-label={label} title={label}>
        {active && <span className="absolute -left-3 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#8bbdff]" />}
        <span className="relative z-10">{icon}</span>
        {active ? (
          <span className="relative z-10 max-w-[58px] truncate text-[9px] font-black leading-none">{label}</span>
        ) : (
          <span className={tooltipClass}>{label}</span>
        )}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={baseClass}
    >
      {active && <span className="absolute -left-3 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#8bbdff]" />}
      <span className="relative z-10">{icon}</span>
      {active ? (
        <span className="relative z-10 max-w-[58px] truncate text-[9px] font-black leading-none">{label}</span>
      ) : (
        <span className={tooltipClass}>{label}</span>
      )}
    </button>
  );
};

const MobileSidebarItem = ({ icon, label, active, onClick, to }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void; to?: string }) => {
  const base = `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition ${active ? 'bg-white/12 text-white' : 'text-white/52 hover:bg-white/8 hover:text-white'}`;
  const iconClass = `flex h-8 w-8 items-center justify-center rounded-xl transition ${active ? 'bg-[#2f80ed] text-white shadow-lg shadow-[#2f80ed]/25' : ''}`;

  if (to) {
    return (
      <Link to={to} className={base}>
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
