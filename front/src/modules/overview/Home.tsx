import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Cpu,
  Database,
  FileText,
  GitBranch,
  MapPin,
  Menu,
  Moon,
  Shield,
  Sun,
  UploadCloud,
  X,
} from 'lucide-react';

import logoSpectrumDark from '../../assets/img/logo-spectrum-groupe-darkmode.png';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';
import worldMapSpectrum from '../../assets/img/world-map-spectrum.jpg';
import atlassianPartnerBadge from '../../assets/img/atlassian partner.png';
import LoginModal from '../auth/LoginModal';
import ResetPassword from '../auth/ResetPassword';
import VerifyEmail from '../auth/VerifyEmail';
import { MainSidebar } from '../../shared/components/MainSidebar';
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher';
import { useI18n } from '../../i18n';
import { useAuthStore } from '../../store/useAuthStore';

const THEME_KEY = 'jira-migration-theme';

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [isLight, setIsLight] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) return savedTheme === 'light';
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [scrolled, setScrolled] = useState(false);

  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const logo = isLight ? logoSpectrum : logoSpectrumDark;
  const badgeLogo = atlassianPartnerBadge;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !isLight);
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  }, [isLight]);

  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      setIsModalOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('auth');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setIsResetModalOpen(location.pathname === '/reset-password');
  }, [location.pathname]);

  const featureCards = useMemo(
    () => [
      {
        icon: <UploadCloud size={24} />,
        title: t('home.feature.import.title'),
        desc: t('home.feature.import.text'),
        tone: 'blue',
      },
      {
        icon: <Shield size={24} />,
        title: t('home.feature.risk.title'),
        desc: t('home.feature.risk.text'),
        tone: 'green',
      },
      {
        icon: <Brain size={24} />,
        title: t('home.feature.ai.title'),
        desc: t('home.feature.ai.text'),
        tone: 'purple',
      },
    ] as const,
    [t],
  );

  const handleMainAction = () => {
    if (isAuthenticated) {
      navigate('/analysis');
      return;
    }
    setIsModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) {
      setIsMobileMenuOpen(false);
      return;
    }

    const navHeight = document.querySelector('nav')?.clientHeight ?? 0;
    const top = Math.round(target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16);
    window.scrollTo({ top, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      {isAuthenticated && <MainSidebar activePage="overview" />}

      <div className={isAuthenticated ? 'pb-20 md:pb-0 md:pl-[72px]' : ''}>
        <nav
          className={`fixed left-0 top-0 z-40 w-full transition-all duration-300 ${
            isAuthenticated ? 'md:left-[72px] md:w-[calc(100%-72px)]' : ''
          } ${
            scrolled
              ? 'border-b border-[#dce4f4] bg-white/92 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0c1730]/92'
              : 'border-b border-transparent bg-transparent py-5'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
            <button onClick={() => navigate('/')} className="flex items-center gap-3" aria-label={t('sidebar.goHome')}>
              <img src={logo} alt="Spectrum Groupe" className={`${isLight ? 'h-8 sm:h-9' : 'h-10 sm:h-12'} max-w-[150px] object-contain sm:max-w-none`} />
            </button>

            <div className="hidden items-center gap-8 text-sm font-bold text-[#64708d] dark:text-white/58 lg:flex">
              <button onClick={() => scrollToSection('features')} className="transition hover:text-[#2f80ed]">{t('nav.features')}</button>
              <button onClick={() => scrollToSection('pipeline')} className="transition hover:text-[#2f80ed]">{t('nav.pipeline')}</button>
              <button onClick={() => scrollToSection('reports')} className="transition hover:text-[#2f80ed]">{t('nav.reports')}</button>
              <button onClick={() => scrollToSection('about')} className="transition hover:text-[#2f80ed]">{t('nav.about')}</button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsMobileMenuOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70 lg:hidden"
                aria-label={t('common.toggleNavigation')}
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <LanguageSwitcher className="hidden lg:flex text-sm" />
              <button
                onClick={() => setIsLight((value) => !value)}
                className="hidden items-center gap-2 rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] px-3 py-2 text-xs font-bold text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70 sm:flex"
                aria-label={t('common.toggleColorMode')}
              >
                <span className="flex h-5 w-9 items-center rounded-full bg-[#dce4f1] p-0.5 dark:bg-[#2c3a57]">
                  <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isLight ? 'translate-x-0' : 'translate-x-4'}`} />
                </span>
                {isLight ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} />}
                <span className="hidden sm:inline">{isLight ? t('common.light') : t('common.dark')}</span>
              </button>

              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/analysis')}
                  className="hidden rounded-xl bg-[#2f80ed] px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#256fdb] sm:inline-flex"
                >
                  {t('common.openAnalysis')}
                </button>
              ) : (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="hidden rounded-xl bg-[#111b3f] px-4 py-2 text-sm font-black text-white transition hover:bg-[#1d2b5b] dark:bg-white dark:text-[#111b3f] sm:inline-flex"
                >
                  {t('common.signIn')}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-4 mt-3 rounded-2xl border border-[#dbe4f2] bg-white p-2 shadow-lg shadow-[#1d2b5b]/8 dark:border-white/10 dark:bg-[#101d3a] lg:hidden"
              >
                <button onClick={() => scrollToSection('features')} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-[#64708d] hover:bg-[#f8faff] dark:text-white/65 dark:hover:bg-white/6">{t('nav.features')}</button>
                <button onClick={() => scrollToSection('pipeline')} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-[#64708d] hover:bg-[#f8faff] dark:text-white/65 dark:hover:bg-white/6">{t('nav.pipeline')}</button>
                <button onClick={() => scrollToSection('reports')} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-[#64708d] hover:bg-[#f8faff] dark:text-white/65 dark:hover:bg-white/6">{t('nav.reports')}</button>
                <button onClick={() => scrollToSection('about')} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-[#64708d] hover:bg-[#f8faff] dark:text-white/65 dark:hover:bg-white/6">{t('nav.about')}</button>

                <div className="my-2 border-t border-[#edf1f8] dark:border-white/10" />
                <div className="flex items-center justify-between gap-3 px-2 py-2">
                  <LanguageSwitcher className="flex text-sm" />
                  <button
                    onClick={() => setIsLight((value) => !value)}
                    className="flex items-center gap-2 rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] px-3 py-2 text-xs font-bold text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                    aria-label={t('common.toggleColorMode')}
                  >
                    {isLight ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} />}
                    {isLight ? t('common.light') : t('common.dark')}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleMainAction();
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f80ed] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#256fdb]"
                >
                  {isAuthenticated ? t('common.openAnalysis') : t('common.signIn')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <main className="overflow-hidden px-3 pb-24 pt-28 sm:px-6 sm:pt-32 lg:px-8">
          <section className="mx-auto grid max-w-7xl min-w-0 items-center gap-8 lg:grid-cols-[1.03fr_0.97fr] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#bdd5fa] bg-[#f5f9ff] px-4 py-2 text-xs font-black text-[#2f80ed] dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]">
                <span className="h-2 w-2 rounded-full bg-[#2f80ed]" />
                {t('home.badge')}
              </div>

              <h1 className="max-w-4xl text-[2.35rem] font-black leading-[1.08] tracking-normal sm:text-6xl">
                {t('home.hero.title')}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#64708d] dark:text-white/62 sm:mt-6 sm:text-lg sm:leading-8">
                {t('home.hero.subtitle')}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleMainAction}
                  className="group flex items-center justify-center gap-3 rounded-xl bg-[#2f80ed] px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-[#256fdb]"
                >
                  {isAuthenticated ? t('home.hero.startAuthenticated') : t('home.hero.startGuest')}
                  <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => scrollToSection('pipeline')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#d7e0ef] bg-white px-6 py-4 text-sm font-black text-[#64708d] transition hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8"
                >
                  {t('home.hero.viewPipeline')}
                </button>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 border-t border-[#dce4f4] pt-6 dark:border-white/10 xs:grid-cols-3 sm:mt-10 sm:grid-cols-3 sm:pt-7">
                <HeroMetric value="3" label={t('home.metrics.pipelineStages')} />
                <HeroMetric value="PDF" label={t('home.metrics.reportOutput')} />
                <HeroMetric value="<2m" label={t('home.metrics.fastPreview')} />
              </div>
            </motion.div>

            <HeroProductPreview t={t} />
          </section>

          <section className="mx-auto mt-8 grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProductHighlight icon={<Shield size={18} />} label={t('home.highlight.secure.title')} text={t('home.highlight.secure.text')} />
            <ProductHighlight icon={<Brain size={18} />} label={t('home.highlight.ai.title')} text={t('home.highlight.ai.text')} />
            <ProductHighlight icon={<FileText size={18} />} label={t('home.highlight.report.title')} text={t('home.highlight.report.text')} />
          </section>

          <section id="features" className="mx-auto mt-16 max-w-7xl sm:mt-24">
            <SectionHeading eyebrow={t('home.features.eyebrow')} title={t('home.features.title')} />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureCards.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </section>

          <section id="pipeline" className="mx-auto mt-16 max-w-7xl overflow-hidden rounded-[22px] bg-[#111b3f] p-5 text-white shadow-xl shadow-[#111b3f]/10 sm:mt-24 sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center min-w-0">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8bbdff]">{t('home.pipeline.eyebrow')}</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t('home.pipeline.title')}</h2>
                <p className="mt-4 text-sm leading-7 text-white/58">
                  {t('home.pipeline.text')}
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/7 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/35">{t('home.pipeline.promiseLabel')}</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {t('home.pipeline.promiseText')}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 overflow-hidden">
                <PipelineCard step="01" icon={<Database size={22} />} title={t('home.pipeline.prepare.title')} desc={t('home.pipeline.prepare.text')} active firstStageLabel={t('home.pipeline.firstStage')} />
                <PipelineCard step="02" icon={<GitBranch size={22} />} title={t('home.pipeline.rules.title')} desc={t('home.pipeline.rules.text')} />
                <PipelineCard step="03" icon={<FileText size={22} />} title={t('home.pipeline.report.title')} desc={t('home.pipeline.report.text')} />
              </div>
            </div>
          </section>

          <section id="reports" className="mx-auto mt-16 max-w-7xl rounded-[22px] border border-[#dbe4f2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101d3a] sm:mt-24 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2f80ed]">{t('home.reports.eyebrow')}</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">{t('home.reports.title')}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64708d] dark:text-white/58">
                  {t('home.reports.text')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <ReportArtifact icon={<Brain size={18} />} title={t('home.reportArtifact.summary.title')} text={t('home.reportArtifact.summary.text')} />
                <ReportArtifact icon={<Shield size={18} />} title={t('home.reportArtifact.risk.title')} text={t('home.reportArtifact.risk.text')} />
                <ReportArtifact icon={<FileText size={18} />} title={t('home.reportArtifact.exports.title')} text={t('home.reportArtifact.exports.text')} />
              </div>
            </div>
          </section>

          <section id="about" className="scroll-mt-28 mx-auto max-w-7xl py-16 sm:py-20">
            <div className="overflow-hidden rounded-[28px] border border-[#dbe4f2] bg-white shadow-xl shadow-[#1d2b5b]/8 dark:border-white/10 dark:bg-[#101d3a]">
              <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="border-b border-[#edf1f8] p-6 dark:border-white/10 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="flex flex-wrap items-center gap-4">
                    <img src={logoSpectrum} alt="Spectrum Groupe" className="h-10 w-auto object-contain dark:hidden" />
                    <img src={logoSpectrumDark} alt="Spectrum Groupe" className="hidden h-10 w-auto object-contain dark:block" />
                    <span className="rounded-full border border-[#bdd5fa] bg-[#f5f9ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#2f80ed] dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]">
                      {t('home.about.eyebrow')}
                    </span>
                  </div>

                  <h2 className="mt-7 text-3xl font-black tracking-tight text-[#111b3f] dark:text-white sm:text-4xl">
                    {t('home.about.title')}
                    <span className="mt-2 block text-xl font-black text-[#2f80ed] sm:text-2xl">
                      {t('home.about.subtitle')}
                    </span>
                  </h2>

                  <p className="mt-5 text-sm leading-7 text-[#64708d] dark:text-white/58">
                    {t('home.about.text')}
                  </p>

                  <div className="mt-6 rounded-2xl border border-[#dbe4f2] bg-[#f8faff] p-5 dark:border-white/10 dark:bg-white/5">
                    <h3 className="flex items-center gap-2 text-sm font-black text-[#111b3f] dark:text-white">
                      <Cpu className="h-5 w-5 text-[#2f80ed]" />
                      {t('home.about.projectTitle')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#64708d] dark:text-white/58">
                      {t('home.about.projectText')}
                    </p>
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    <AboutMetric value={t('home.about.metric.atlassian.value')} label={t('home.about.metric.atlassian.label')} />
                    <AboutMetric value={t('home.about.metric.global.value')} label={t('home.about.metric.global.label')} />
                    <AboutMetric value={t('home.about.metric.cloud.value')} label={t('home.about.metric.cloud.label')} />
                  </div>
                </div>

                <SpectrumPresenceMap t={t} badgeLogo={badgeLogo} />
              </div>
            </div>
          </section>
          <section className="mx-auto mt-10 max-w-7xl rounded-[22px] bg-[#2f80ed] p-5 text-white shadow-xl shadow-blue-500/20 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">{t('home.cta.eyebrow')}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t('home.cta.title')}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">
                  {t('home.cta.text')}
                </p>
              </div>
              <button
                onClick={handleMainAction}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 text-sm font-black text-[#111b3f] transition hover:-translate-y-0.5"
              >
                {isAuthenticated ? t('common.openAnalysis') : t('home.cta.signIn')}
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        </main>

        <footer className="border-t border-[#dce4f4] px-4 py-8 text-center dark:border-white/10">
          <img src={logo} alt="Spectrum Groupe" className={`${isLight ? 'h-7' : 'h-10'} mx-auto w-auto object-contain opacity-70`} />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#8a96b3] dark:text-white/40">
            &copy; 2026 Spectrum Groupe &middot; {t('home.footer')}
          </p>
        </footer>
      </div>

      <AnimatePresence>
        {isModalOpen && <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        {isResetModalOpen && (
          <ResetPassword
            isModal
            onClose={() => {
              setIsResetModalOpen(false);
              navigate('/');
            }}
          />
        )}
        {location.pathname === '/verify-email' && (
          <VerifyEmail onClose={() => navigate('/?auth=login')} />
        )}
      </AnimatePresence>
    </div>
  );
};

const AboutMetric = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-2xl border border-[#dbe4f2] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
    <p className="text-lg font-black text-[#111b3f] dark:text-white">{value}</p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96b3] dark:text-white/45">{label}</p>
  </div>
);

const SpectrumPresenceMap = ({ t, badgeLogo }: { t: (key: string) => string; badgeLogo: string }) => {
  const locations = [
    { key: 'uk', city: t('home.about.location.uk.city'), country: t('home.about.location.uk.country'), left: '48.8%', top: '36.5%' },
    { key: 'france', city: t('home.about.location.france.city'), country: t('home.about.location.france.country'), left: '49.8%', top: '41.5%' },
    { key: 'tunisia', city: t('home.about.location.tunisia.city'), country: t('home.about.location.tunisia.country'), left: '51.5%', top: '49.5%' },
    { key: 'egypt', city: t('home.about.location.egypt.city'), country: t('home.about.location.egypt.country'), left: '56.8%', top: '54.5%' },
    { key: 'saudi', city: t('home.about.location.saudi.city'), country: t('home.about.location.saudi.country'), left: '60.0%', top: '58.5%' },
    { key: 'uae', city: t('home.about.location.uae.city'), country: t('home.about.location.uae.country'), left: '62.8%', top: '58.0%' },
    { key: 'ivory', city: t('home.about.location.ivory.city'), country: t('home.about.location.ivory.country'), left: '47.0%', top: '64.5%' },
  ];

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[24px] bg-white/90 shadow-xl shadow-[#1d2b5b]/10 dark:bg-[#071426]/95 lg:max-w-3xl lg:rounded-l-none lg:rounded-r-[32px]">
      <div className="relative overflow-hidden bg-[#f4f7fb] dark:bg-[#09182d]">
        <img
          src={worldMapSpectrum}
          alt={t('home.about.mapAria')}
          className="w-full select-none object-contain opacity-100 filter contrast-110 dark:brightness-95 dark:contrast-125"
          draggable={false}
        />
        <div className="absolute inset-0">
          {locations.map(({ key, ...location }) => (
            <PresencePoint key={key} {...location} />
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-8">
        <div className="flex items-center justify-center rounded-[28px] bg-white px-6 py-5 shadow-sm dark:bg-[#0b1f3b]">
          <img src={badgeLogo} alt="Atlassian Partner" className="h-16 w-auto max-w-[180px] object-contain dark:brightness-125 dark:contrast-125 sm:h-24 sm:max-w-[220px]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#dbe4f2] bg-white/90 px-4 py-3 text-center shadow-sm dark:border-white/10 dark:bg-[#0b1f3b]">
            <p className="text-sm font-black text-[#111b3f] dark:text-white">{t('home.about.stat.expertise')}</p>
          </div>
          <div className="rounded-2xl border border-[#dbe4f2] bg-white/90 px-4 py-3 text-center shadow-sm dark:border-white/10 dark:bg-[#0b1f3b]">
            <p className="text-sm font-black text-[#111b3f] dark:text-white">{t('home.about.stat.clients')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe4f2] bg-white/90 px-5 py-3 shadow-sm dark:border-white/10 dark:bg-[#0b1f3b]">
          <p className="text-center text-xs font-bold leading-5 text-[#64708d] dark:text-[#cfd8ff]">
            {t('home.about.presenceLine')}
          </p>
        </div>
      </div>
    </div>
  );
};

const PresencePoint = ({ city, country, left, top }: { city: string; country: string; left: string; top: string }) => (
  <div className="group absolute z-10 -translate-x-1/2 -translate-y-full" style={{ left, top }}>
    <div className="relative flex h-5 w-5 items-center justify-center">
      <MapPin className="h-4 w-4 fill-[#2f80ed] text-[#2f80ed] drop-shadow-sm" />
      <span className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
    </div>
    <span className="pointer-events-none absolute left-5 top-1/2 hidden min-w-max -translate-y-1/2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#111b3f] shadow-lg ring-1 ring-[#dbe4f2] sm:group-hover:block">
      {city} - {country}
    </span>
  </div>
);
const HeroMetric = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="text-2xl font-black">{value}</p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/40">{label}</p>
  </div>
);

const ProductHighlight = ({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) => (
  <article className="flex items-start gap-3 rounded-2xl border border-[#dbe4f2] bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#10264d] dark:text-[#8bbdff]">
      {icon}
    </span>
    <div>
      <h3 className="text-sm font-black">{label}</h3>
      <p className="mt-1 text-xs leading-5 text-[#64708d] dark:text-white/55">{text}</p>
    </div>
  </article>
);

const HeroProductPreview = ({ t }: { t: (key: string) => string }) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.08 }}
    className="min-w-0 rounded-[22px] bg-white p-3 shadow-xl shadow-[#1d2b5b]/8 ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-4"
  >
    <div className="overflow-hidden rounded-[18px] border border-[#dbe4f2] dark:border-white/10">
      <div className="flex items-start justify-between gap-3 bg-[#f8faff] px-4 py-4 dark:bg-white/5 sm:items-center sm:px-5">
        <div>
          <p className="text-xs font-black uppercase text-[#8a96b3] dark:text-white/45">{t('home.preview.live')}</p>
          <h2 className="mt-1 break-words text-base font-black sm:text-lg">Spectrum-Prod-DC</h2>
        </div>
        <span className="rounded-full bg-[#e9fbf4] px-3 py-1.5 text-[10px] font-black uppercase text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]">
          {t('home.preview.ready')}
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[160px_1fr]">
        <div className="rounded-2xl bg-[#eaf3ff] p-5 text-center text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]">
          <p className="text-[10px] font-black uppercase opacity-70">{t('home.preview.score')}</p>
          <p className="mt-3 text-5xl font-black">84</p>
          <p className="text-xs font-black opacity-60">{t('home.preview.readiness')}</p>
        </div>

        <div className="space-y-3">
          <PreviewRow label={t('home.preview.dataPreparation')} value={t('home.preview.complete')} tone="green" progress={100} />
          <PreviewRow label={t('home.preview.compatibility')} value={t('home.preview.blockers')} tone="red" progress={72} />
          <PreviewRow label={t('home.preview.reportGeneration')} value={t('home.preview.ready')} tone="blue" progress={100} />
        </div>
      </div>

      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
        <PreviewFinding title={t('home.preview.scriptRunner')} text={t('home.preview.scriptRunnerText')} tone="warning" />
        <PreviewFinding title={t('home.preview.marketplace')} text={t('home.preview.marketplaceText')} tone="success" />
      </div>

      <div className="m-4 mt-0 rounded-2xl bg-[#111b3f] p-4 text-white dark:bg-[#071126] sm:m-5 sm:mt-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2f80ed]">
              <Brain size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-[#8bbdff]">{t('home.preview.recommendation')}</p>
              <p className="truncate text-xs text-white/75">{t('home.preview.recommendationText')}</p>
            </div>
          </div>
          <span className="rounded-lg bg-white/8 px-3 py-2 text-[10px] font-black uppercase text-white/70">{t('common.report')}</span>
        </div>
      </div>
    </div>
  </motion.div>
);

const PreviewRow = ({ label, value, tone, progress }: { label: string; value: string; tone: 'green' | 'red' | 'blue'; progress: number }) => {
  const color = tone === 'green' ? 'bg-[#23d18b]' : tone === 'red' ? 'bg-[#e54848]' : 'bg-[#2f80ed]';
  const textColor = tone === 'green' ? 'text-[#159866] dark:text-[#67e8b9]' : tone === 'red' ? 'text-[#e54848] dark:text-red-300' : 'text-[#2f80ed] dark:text-[#8bbdff]';

  return (
    <div className="rounded-2xl border border-[#edf1f8] bg-white p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black">{label}</span>
        <span className={`text-[10px] font-black uppercase ${textColor}`}>{value}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dfe8f6] dark:bg-white/10">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

const PreviewFinding = ({ title, text, tone }: { title: string; text: string; tone: 'warning' | 'success' }) => (
  <div className={`rounded-2xl border p-4 ${tone === 'warning' ? 'border-[#ffd36d] bg-[#fff9e6] text-[#9b4f00] dark:border-[#f59e0b]/30 dark:bg-[#f59e0b]/10 dark:text-[#ffbe4d]' : 'border-green-200 bg-[#e9fbf4] text-[#159866] dark:border-[#23d18b]/20 dark:bg-[#23d18b]/12 dark:text-[#67e8b9]'}`}>
    <h3 className="text-xs font-black">{title}</h3>
    <p className="mt-1 text-xs leading-5 opacity-75">{text}</p>
  </div>
);



const SectionHeading = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2f80ed]">{eyebrow}</p>
    <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
  </div>
);

const featureToneClasses = {
  blue: 'bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]',
  green: 'bg-[#e9fbf4] text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]',
  purple: 'bg-[#f3eefe] text-[#7c3aed] dark:bg-[#7c3aed]/14 dark:text-[#c4b5fd]',
};

const FeatureCard = ({ icon, title, desc, tone }: { icon: React.ReactNode; title: string; desc: string; tone: keyof typeof featureToneClasses }) => (
  <article className="rounded-[18px] border border-[#dbe4f2] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1d2b5b]/8 dark:border-white/10 dark:bg-[#101d3a]">
    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${featureToneClasses[tone]}`}>{icon}</div>
    <h3 className="text-lg font-black">{title}</h3>
    <p className="mt-3 text-sm leading-7 text-[#64708d] dark:text-white/58">{desc}</p>
  </article>
);

const PipelineCard = ({
  step,
  icon,
  title,
  desc,
  active,
  firstStageLabel,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  active?: boolean;
  firstStageLabel?: string;
}) => (
  <div className={`w-full min-w-0 rounded-2xl border p-5 relative z-0 transform-none transition ${active ? 'border-[#2f80ed]/45 bg-[#2f80ed]/14' : 'border-white/10 bg-white/7'}`}>
    <div className="flex items-start gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#2f80ed] text-white' : 'bg-white/8 text-[#8bbdff]'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-white/35">{step}</span>
          {active && (
            <span className="rounded-full bg-[#23d18b]/16 px-2 py-0.5 text-[9px] font-black uppercase text-[#67e8b9]">
              {firstStageLabel ?? 'First stage'}
            </span>
          )}
        </div>
        <h3 className="mt-1 break-words text-sm font-black">{title}</h3>
        <p className="mt-2 break-words text-xs leading-5 text-white/55">{desc}</p>
      </div>
    </div>
  </div>
);

const ReportArtifact = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <article className="rounded-2xl border border-[#edf1f8] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/5">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2f80ed] shadow-sm dark:bg-[#10264d] dark:text-[#8bbdff]">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-black">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#64708d] dark:text-white/55">{text}</p>
      </div>
    </div>
  </article>
);

export default Home;