import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUp,
  Brain,
  Cloud,
  Cpu,
  Database,
  FileText,
  GitBranch,
  Layers3,
  Menu,
  Moon,
  Shield,
  Sparkles,
  Sun,
  UploadCloud,
  Workflow,
  X,
} from 'lucide-react';

import logoSpectrumDark from '../../assets/img/logo-spectrum-groupe-darkmode.png';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';
import atlassianPartnerBadge from '../../assets/img/atlassian partner.png';
import jiraLogo from '../../assets/img/jira.png';
import atlassianLogo from '../../assets/img/atlassian.png';
import spectrumOfficesMap from '../../assets/img/spectrum-offices-map.png';
import LoginModal from '../auth/LoginModal';
import ResetPassword from '../auth/ResetPassword';
import VerifyEmail from '../auth/VerifyEmail';
import { MainSidebar } from '../../shared/components/MainSidebar';
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher';
import { useI18n } from '../../i18n';
import { useAuthStore } from '../../store/useAuthStore';

const THEME_KEY = 'jira-migration-theme';
const SECTION_IDS = ['hero', 'features', 'pipeline', 'reports', 'about'] as const;

const getNavOffset = () => (document.querySelector('nav')?.clientHeight ?? 0) + 28;

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [isLight, setIsLight] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) return savedTheme === 'light';
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [scrolled, setScrolled] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const activeSectionLockRef = useRef<string | null>(null);

  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const logo = isLight ? logoSpectrum : logoSpectrumDark;
  const badgeLogo = atlassianPartnerBadge;
  const isResetRoute = location.pathname === '/reset-password';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsSmallScreen(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !isLight);
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  }, [isLight]);

  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      const timer = window.setTimeout(() => setIsModalOpen(true), 0);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('auth');
      setSearchParams(nextParams, { replace: true });
      return () => window.clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let ticking = false;

    const updateActiveSection = () => {
      const lockedSection = activeSectionLockRef.current;
      if (lockedSection) {
        setActiveSection((previous) => (previous === lockedSection ? previous : lockedSection));
        ticking = false;
        return;
      }

      const navOffset = getNavOffset();
      const viewportTop = window.scrollY + navOffset;
      const viewportBottom = window.scrollY + window.innerHeight;
      let current = 'hero';
      let bestVisibleArea = 0;

      SECTION_IDS.forEach((id) => {
        const section = document.getElementById(id);
        if (!section) return;

        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const visibleArea = Math.max(0, Math.min(sectionBottom, viewportBottom) - Math.max(sectionTop, viewportTop));

        if (visibleArea > bestVisibleArea) {
          bestVisibleArea = visibleArea;
          current = id;
        }
      });

      setActiveSection((previous) => (previous === current ? previous : current));
      ticking = false;
    };

    const handleScrollSpy = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateActiveSection);
      }
    };

    const initialTimer = window.setTimeout(updateActiveSection, 0);
    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener('scroll', handleScrollSpy);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  const navItems = useMemo(
    () => [
      { id: 'features', label: t('nav.features') },
      { id: 'pipeline', label: t('nav.pipeline') },
      { id: 'reports', label: t('nav.reports') },
      { id: 'about', label: t('nav.about') },
    ],
    [t],
  );

  const handleMainAction = () => {
    if (isAuthenticated) {
      navigate('/analysis');
      return;
    }
    setIsModalOpen(true);
  };

  const lockActiveSection = (id: string) => {
    activeSectionLockRef.current = id;
    setActiveSection(id);

    window.setTimeout(() => {
      if (activeSectionLockRef.current === id) {
        activeSectionLockRef.current = null;
        setActiveSection(id);
      }
    }, 950);
  };

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) {
      setIsMobileMenuOpen(false);
      return;
    }

    lockActiveSection(id);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIsMobileMenuOpen(false);
  };

  const scrollToTop = () => {
    lockActiveSection('hero');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      {isAuthenticated && <MainSidebar activePage="overview" />}

      <div className={isAuthenticated ? 'pb-20 md:pb-0 md:pl-[88px]' : ''}>
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

            <div className="hidden items-center gap-2 text-sm font-bold text-[#64708d] dark:text-white/58 lg:flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`inline-flex h-10 min-w-[96px] items-center justify-center rounded-xl px-4 text-center leading-none transition hover:text-[#2f80ed] ${activeSection === item.id ? 'text-[#2f80ed]' : ''}`}
                >
                  {item.label}
                </button>
              ))}
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
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-black ${
                      activeSection === item.id ? 'bg-[#f8fbff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]' : 'text-[#64708d] dark:text-white/65'
                    } hover:bg-[#f8faff] dark:hover:bg-white/6`}
                  >
                    {item.label}
                  </button>
                ))}

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

        <main className="overflow-hidden px-3 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8">
          <section id="hero" className="scroll-mt-28 mx-auto grid min-h-[calc(100vh-112px)] max-w-7xl min-w-0 items-center gap-7 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <h1 className="max-w-4xl text-[2.25rem] font-black leading-[1.05] tracking-normal sm:text-5xl xl:text-[3.55rem]">
                {t('home.hero.title')}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-[#64708d] dark:text-white/62 sm:text-lg sm:leading-8">
                {t('home.hero.subtitle')}
              </p>

              <BrandLogoStrip t={t} />

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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

              <div className="mt-7 grid max-w-2xl grid-cols-3 gap-3 border-t border-[#dce4f4] pt-5 dark:border-white/10 sm:mt-8 sm:pt-6">
                <HeroMetric value="3" label={t('home.metrics.pipelineStages')} />
                <HeroMetric value="PDF" label={t('home.metrics.reportOutput')} />
                <HeroMetric value="<2m" label={t('home.metrics.fastPreview')} />
              </div>
            </motion.div>

            <HeroMigrationScene t={t} noMotion={isSmallScreen} />
          </section>

          <section id="features" className="scroll-mt-28 mx-auto mt-12 max-w-7xl pb-14 pt-7 sm:mt-16 sm:pb-16 sm:pt-8">
            <FeatureShowcaseSection t={t} badgeLogo={badgeLogo} noMotion={isSmallScreen} />
          </section>

          <section id="pipeline" className="scroll-mt-28 mx-auto mt-16 max-w-7xl sm:mt-20">
            <PipelineShowcaseSection t={t} noMotion={isSmallScreen} />
          </section>

          <section id="reports" className="scroll-mt-28 mx-auto mt-16 max-w-7xl sm:mt-20">
            <ReportsShowcaseSection t={t} />
          </section>

          <section id="about" className="scroll-mt-16 mx-auto max-w-7xl pb-16 pt-10 sm:pb-20 sm:pt-12">
            <div className="w-full overflow-hidden rounded-[28px] border border-[#dbe4f2] bg-white shadow-xl shadow-[#1d2b5b]/8 dark:border-white/10 dark:bg-[#101d3a]">
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

                  <div className="mt-6 rounded-2xl border border-[#dbe4f2] bg-[#f8faff] px-5 py-4 dark:border-white/10 dark:bg-white/5">
                    <h3 className="flex items-center gap-2 text-sm font-black text-[#111b3f] dark:text-white">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2f80ed] shadow-sm dark:bg-[#10264d] dark:text-[#8bbdff]">
                        <Cpu className="h-4 w-4" />
                      </span>
                      {t('home.about.projectTitle')}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#64708d] dark:text-white/58">
                      {t('home.about.projectText')}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-2 sm:grid-cols-3">
                    <AboutMetric value={t('home.about.metric.atlassian.value')} label={t('home.about.metric.atlassian.label')} />
                    <AboutMetric value={t('home.about.metric.global.value')} label={t('home.about.metric.global.label')} />
                    <AboutMetric value={t('home.about.metric.cloud.value')} label={t('home.about.metric.cloud.label')} />
                  </div>
                </div>

                <SpectrumPresenceMap t={t} />
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

        <footer className="border-t border-[#dce4f4] bg-white/65 dark:border-white/10 dark:bg-[#071126]">
          <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_1.18fr_0.92fr] lg:items-start">
              <div>
                <button onClick={() => scrollToSection('hero')} className="inline-flex items-center" aria-label={t('sidebar.goHome')}>
                  <img src={logo} alt="Spectrum Groupe" className={`${isLight ? 'h-9' : 'h-12'} w-auto object-contain`} />
                </button>
                <p className="mt-3 max-w-lg text-sm leading-6 text-[#64708d] dark:text-white/55">
                  {t('home.footer.description')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#dbe4f2] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-[#8bbdff]">
                    Jira DC
                  </span>
                  <span className="rounded-full border border-[#dbe4f2] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-[#8bbdff]">
                    Atlassian Cloud
                  </span>
                  <span className="rounded-full border border-[#dbe4f2] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-[#8bbdff]">
                    {t('home.scene.analysis')}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8a96b3] dark:text-white/38">
                  {t('home.footer.includes')}
                </p>
                <div className="mt-3 grid gap-2.5">
                  <FooterInsight icon={<Shield size={16} />} title={t('home.footer.insight.risk.title')} text={t('home.footer.insight.risk.text')} />
                  <FooterInsight icon={<Brain size={16} />} title={t('home.footer.insight.summary.title')} text={t('home.footer.insight.summary.text')} />
                  <FooterInsight icon={<FileText size={16} />} title={t('home.footer.insight.outputs.title')} text={t('home.footer.insight.outputs.text')} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe4f2] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2f80ed] dark:text-[#8bbdff]">
                  {t('home.footer.product')}
                </p>
                <h2 className="mt-2 text-lg font-black text-[#111b3f] dark:text-white">{t('home.footer')}</h2>
                <p className="mt-2 text-sm leading-6 text-[#64708d] dark:text-white/55">
                  {t('home.footer.productText')}
                </p>
                <div className="mt-3 grid gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#8a96b3] dark:text-white/42">
                  <span>{t('home.footer.scope.package')}</span>
                  <span>{t('home.footer.scope.rules')}</span>
                  <span>{t('home.footer.scope.report')}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#dce4f4] pt-4 text-xs font-bold text-[#8a96b3] dark:border-white/10 dark:text-white/38 sm:flex-row sm:items-center sm:justify-between">
              <p>&copy; 2026 Spectrum Groupe</p>
              <p>{t('home.footer.compliance')}</p>
            </div>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {scrolled && (
          <motion.button
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.92 }}
            onClick={scrollToTop}
            className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#bdd5fa] bg-white text-[#2f80ed] shadow-xl shadow-[#1d2b5b]/12 transition hover:-translate-y-0.5 hover:bg-[#f5f9ff] dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff] dark:shadow-black/20"
            aria-label={t('common.backToTop')}
          >
            <ArrowUp size={20} strokeWidth={2.4} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        {isResetRoute && (
          <ResetPassword
            isModal
            onClose={() => {
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

const BrandLogoStrip = ({ t }: { t: (key: string) => string }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.16 }}
    className="mt-6 flex flex-wrap items-center gap-3"
  >
    <BrandPill icon={<JiraLogoMark />} label="Jira Data Center" caption={t('home.brand.jira')} />
    <BrandPill icon={<AtlassianLogoMark />} label="Atlassian Cloud" caption={t('home.brand.atlassian')} />
    <BrandPill icon={<Sparkles size={16} />} label={t('home.scene.analysis')} caption={t('home.brand.audit')} />
  </motion.div>
);

const BrandPill = ({ icon, label, caption }: { icon: React.ReactNode; label: string; caption: string }) => (
  <div className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-[#dbe4f2] bg-white/82 px-4 py-2.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/7">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/14 dark:text-[#8bbdff]">
      {icon}
    </span>
    <div>
      <p className="text-sm font-black leading-none">{label}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a96b3] dark:text-white/42">{caption}</p>
    </div>
  </div>
);

const FooterInsight = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="flex gap-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/14 dark:text-[#8bbdff]">
      {icon}
    </span>
    <div>
      <p className="text-sm font-black text-[#111b3f] dark:text-white">{title}</p>
      <p className="mt-0.5 text-xs leading-5 text-[#64708d] dark:text-white/50">{text}</p>
    </div>
  </div>
);

const FeatureShowcaseSection = ({ t, badgeLogo, noMotion }: { t: (key: string) => string; badgeLogo: string; noMotion?: boolean }) => {
  const signals = [
    { icon: <UploadCloud size={18} />, label: t('home.feature.import.title'), value: t('home.feature.import.detail') },
    { icon: <Shield size={18} />, label: t('home.feature.risk.title'), value: t('home.feature.risk.detail') },
    { icon: <Brain size={18} />, label: t('home.feature.ai.title'), value: t('home.feature.ai.detail') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center"
    >
      <div className="relative overflow-hidden rounded-[28px] bg-[#111b3f] p-7 text-white shadow-xl shadow-[#111b3f]/12 sm:p-8">
        <div className="absolute inset-y-8 right-0 w-px bg-white/10" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8bbdff]">{t('home.features.eyebrow')}</p>
          <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">{t('home.features.title')}</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/62">{t('home.ecosystem.text')}</p>

          <div className="mt-7 grid gap-3">
            {signals.map((signal, index) => (
              <motion.div
                key={signal.label}
                initial={noMotion ? false : { opacity: 0, x: -14 }}
                whileInView={noMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.34, delay: index * 0.07 }}
                className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#8bbdff]">{signal.icon}</span>
                  <p className="truncate text-sm font-black">{signal.label}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/48">
                  {signal.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <FeatureVisualCanvas t={t} badgeLogo={badgeLogo} noMotion={noMotion} />
    </motion.div>
  );
};

const FeatureVisualCanvas = ({ t, badgeLogo, noMotion }: { t: (key: string) => string; badgeLogo: string; noMotion?: boolean }) => (
  <div className="relative min-h-[430px] overflow-hidden rounded-[28px] border border-[#dbe4f2] bg-white p-5 shadow-xl shadow-[#1d2b5b]/8 dark:border-white/10 dark:bg-[#101d3a] sm:p-6">
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(47,128,237,0.08),transparent_42%),radial-gradient(circle_at_78%_20%,rgba(35,209,139,0.14),transparent_30%)] dark:bg-[linear-gradient(135deg,rgba(47,128,237,0.14),transparent_42%),radial-gradient(circle_at_78%_20%,rgba(35,209,139,0.12),transparent_30%)]" />

    <div className="relative flex flex-wrap items-center justify-between gap-3">
      <span className="rounded-full bg-[#eaf3ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#2f80ed] dark:bg-[#2f80ed]/14 dark:text-[#8bbdff]">
        {t('home.audit.eyebrow')}
      </span>
      <img src={badgeLogo} alt="Atlassian Partner" className="h-10 w-auto max-w-[120px] object-contain dark:brightness-125 dark:contrast-125" />
    </div>

    <div className="relative mt-8 grid min-h-[238px] place-items-center">
      <div className="absolute left-8 right-8 top-1/2 hidden h-px -translate-y-1/2 bg-[#dbe4f2] dark:bg-white/10 sm:block" />
      <motion.div
        animate={noMotion ? undefined : { rotate: 360 }}
        transition={noMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute h-48 w-48 rounded-full border border-dashed border-[#bdd5fa] dark:border-[#2f80ed]/35"
      />
      <motion.span
        animate={noMotion ? undefined : { x: ['-14rem', '14rem'], opacity: [0.2, 1, 0.2] }}
        transition={noMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full bg-[#23d18b] shadow-[0_0_18px_rgba(35,209,139,0.9)] sm:block"
      />

      <FeatureEndpoint className="left-0 top-1/2 -translate-y-1/2" icon={<JiraLogoMark className="h-9 w-9" />} label="Jira DC" />
      <FeatureEndpoint className="right-0 top-1/2 -translate-y-1/2" icon={<AtlassianLogoMark className="h-9 w-9" />} label="Cloud" alignRight />

      <motion.div
        animate={noMotion ? undefined : { y: [-5, 5, -5] }}
        transition={noMotion ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-[30px] border border-[#bdd5fa] bg-white text-center shadow-2xl shadow-[#2f80ed]/16 dark:border-[#2f80ed]/28 dark:bg-[#0b1f3b]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f80ed] text-white">
          <Workflow size={24} />
        </span>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.08em]">{t('home.features.engine')}</p>
      </motion.div>
    </div>

    <div className="relative grid gap-3 border-t border-[#edf1f8] pt-4 dark:border-white/10 sm:grid-cols-4">
      <FeatureOutcome icon={<Database size={16} />} label={t('home.audit.export')} />
      <FeatureOutcome icon={<Layers3 size={16} />} label={t('home.audit.rules')} />
      <FeatureOutcome icon={<Cloud size={16} />} label={t('home.audit.cloud')} />
      <FeatureOutcome icon={<FileText size={16} />} label={t('home.audit.report')} />
    </div>
  </div>
);

const FeatureEndpoint = ({ className, icon, label, alignRight }: { className: string; icon: React.ReactNode; label: string; alignRight?: boolean }) => (
  <div className={`absolute z-10 hidden w-[124px] rounded-2xl border border-[#dbe4f2] bg-white/92 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0b1f3b]/92 sm:block ${className} ${alignRight ? 'text-right' : ''}`}>
    <div className={`flex items-center gap-3 ${alignRight ? 'flex-row-reverse' : ''}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ff] dark:bg-[#2f80ed]/14">{icon}</span>
      <p className="text-xs font-black">{label}</p>
    </div>
  </div>
);

const FeatureOutcome = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 rounded-2xl bg-[#f8faff] px-3 py-3 text-xs font-black dark:bg-white/5">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#2f80ed] shadow-sm dark:bg-[#10264d] dark:text-[#8bbdff]">{icon}</span>
    <span className="truncate">{label}</span>
  </div>
);

const JiraLogoMark = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <img src={jiraLogo} alt="" aria-hidden="true" className={`${className} object-contain`} />
);

const AtlassianLogoMark = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <img src={atlassianLogo} alt="" aria-hidden="true" className={`${className} object-contain`} />
);

const AboutMetric = ({ value, label }: { value: string; label: string }) => (
  <div className="flex min-h-[58px] items-center gap-3 rounded-full border border-[#dbe4f2] bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
    <span className="h-2 w-2 shrink-0 rounded-full bg-[#2f80ed] shadow-[0_0_0_4px_rgba(47,128,237,0.12)]" />
    <div className="min-w-0">
      <p className="truncate text-sm font-black text-[#111b3f] dark:text-white">{value}</p>
      <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[0.14em] text-[#8a96b3] dark:text-white/45">{label}</p>
    </div>
  </div>
);

const SpectrumPresenceMap = ({ t }: { t: (key: string) => string }) => {
  const offices = [
    { key: 'london', city: t('home.about.location.uk.city'), country: t('home.about.location.uk.country'), left: '47.5%', top: '30.5%' },
    { key: 'paris', city: t('home.about.location.france.city'), country: t('home.about.location.france.country'), left: '48%', top: '34%', pulse: true },
    { key: 'marseille', city: t('home.about.location.marseille.city'), country: t('home.about.location.france.country'), left: '49%', top: '37%' },
    { key: 'tunis', city: t('home.about.location.tunisia.city'), country: t('home.about.location.tunisia.country'), left: '50%', top: '42%', pulse: true },
    { key: 'abidjan', city: t('home.about.location.ivory.city'), country: t('home.about.location.ivory.country'), left: '45.8%', top: '58.8%' },
    { key: 'cairo', city: t('home.about.location.egypt.city'), country: t('home.about.location.egypt.country'), left: '56%', top: '45%' },
    { key: 'dubai', city: t('home.about.location.uae.city'), country: t('home.about.location.uae.country'), left: '64%', top: '47%', pulse: true },
    { key: 'oman', city: t('home.about.location.oman.city'), country: t('home.about.location.oman.country'), left: '64.5%', top: '50.5%' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="relative h-full min-h-[430px] overflow-hidden bg-white transition-colors duration-300 dark:bg-[#0b162d]"
    >
      <div className="absolute left-6 top-6 z-10 sm:left-8 sm:top-9">
        <span className="rounded-full border border-[#bdd5fa] bg-[#f5f9ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#2f80ed] shadow-sm dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]">
          {t('home.about.mapEyebrow')}
        </span>
      </div>
      <div className="flex h-full min-h-[430px] items-center p-6 sm:p-8">
        <div className="relative mx-auto aspect-[1292/730] w-full">
          <div className="absolute inset-0 hidden rounded-[28px] bg-[radial-gradient(circle_at_55%_45%,rgba(47,128,237,0.16),transparent_42%)] dark:block" />
          <img
            src={spectrumOfficesMap}
            alt={t('home.about.mapAria')}
            className="absolute inset-0 h-full w-full select-none object-contain opacity-100 brightness-75 contrast-150 transition duration-300 dark:opacity-45 dark:brightness-125 dark:contrast-100"
            draggable={false}
          />
          <div className="absolute inset-0">
            {offices.map(({ key, ...office }, index) => (
              <PresencePoint key={key} {...office} index={index} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PresencePoint = ({
  city,
  country,
  left,
  top,
  index,
  pulse,
}: {
  city: string;
  country: string;
  left: string;
  top: string;
  index: number;
  pulse?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.7, y: 6 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.3, delay: index * 0.045 }}
    className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
    style={{ left, top }}
  >
    <div className="relative flex h-4 w-4 items-center justify-center">
      {pulse && (
        <motion.span
          animate={{ scale: [1, 2.4, 1], opacity: [0.28, 0, 0.28] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut', delay: index * 0.15 }}
          className="absolute h-4 w-4 rounded-full bg-[#2f80ed]"
        />
      )}
      <span className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-1 ring-[#2f80ed]/40 dark:bg-[#dbeaff] dark:ring-[#8bbdff]/60" />
      <span className="relative h-2 w-2 rounded-full bg-[#2f80ed] shadow-[0_0_10px_rgba(47,128,237,0.7)]" />
    </div>
    <span className="pointer-events-none absolute left-4 top-1/2 hidden min-w-max -translate-y-1/2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#111b3f] shadow-lg ring-1 ring-[#bdd5fa] dark:bg-[#101d3a] dark:text-white dark:ring-[#2f80ed]/35 sm:group-hover:block">
      {city} - {country}
    </span>
  </motion.div>
);
const HeroMetric = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="text-xl font-black sm:text-2xl">{value}</p>
    <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/40 sm:text-[10px]">{label}</p>
  </div>
);

const HeroMigrationScene = ({ t, noMotion }: { t: (key: string) => string; noMotion?: boolean }) => (
  <motion.div
    initial={noMotion ? false : { opacity: 0, y: 22 }}
    animate={noMotion ? undefined : { opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.08 }}
    className="relative min-h-[440px] overflow-hidden rounded-[28px] border border-[#dbe4f2] bg-white p-5 shadow-xl shadow-[#1d2b5b]/8 dark:border-white/10 dark:bg-[#101d3a]"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(47,128,237,0.16),transparent_38%),linear-gradient(180deg,rgba(248,250,255,0.96),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_24%,rgba(47,128,237,0.2),transparent_38%)]" />

    <div className="relative flex items-center justify-between gap-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a96b3] dark:text-white/45">{t('home.scene.eyebrow')}</p>
      <span className="rounded-full bg-[#e9fbf4] px-3 py-1.5 text-[10px] font-black uppercase text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]">
        {t('home.scene.ready')}
      </span>
    </div>

    <div className="relative mt-8 grid min-h-[256px] place-items-center">
      <motion.div
        animate={noMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={noMotion ? undefined : { duration: 2.7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute h-56 w-56 rounded-full bg-[#eaf3ff] blur-2xl dark:bg-[#2f80ed]/16"
      />
      <div className="absolute left-8 right-8 top-1/2 hidden h-px -translate-y-1/2 bg-[#dbe4f2] dark:bg-white/10 sm:block" />
      <motion.span
        animate={noMotion ? undefined : { x: ['-15rem', '15rem'] }}
        transition={noMotion ? undefined : { duration: 3.3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#2f80ed] shadow-[0_0_22px_rgba(47,128,237,0.95)] sm:block"
      />

      <HeroFlowNode className="left-0 top-1/2 -translate-y-1/2" icon={<JiraLogoMark className="h-9 w-9" />} title={t('home.scene.jira')} subtitle="Data Center" />
      <HeroFlowNode className="right-0 top-1/2 -translate-y-1/2" icon={<AtlassianLogoMark className="h-9 w-9" />} title={t('home.scene.cloud')} subtitle="Cloud" align="right" />

      <motion.div
        animate={noMotion ? undefined : { y: [-6, 6, -6] }}
        transition={noMotion ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-[32px] border border-[#bdd5fa] bg-white shadow-2xl shadow-[#2f80ed]/16 dark:border-[#2f80ed]/28 dark:bg-[#0b1f3b]"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2f80ed] text-white">
          <Brain size={26} />
        </span>
        <p className="mt-3 text-center text-sm font-black">{t('home.scene.analysis')}</p>
      </motion.div>
    </div>

    <div className="relative grid gap-3 sm:grid-cols-3">
      <HeroFlowStep icon={<Database size={17} />} label={t('home.scene.extract')} />
      <HeroFlowStep icon={<Workflow size={17} />} label={t('home.scene.map')} />
      <HeroFlowStep icon={<FileText size={17} />} label={t('home.scene.report')} />
    </div>
  </motion.div>
);

const HeroFlowNode = ({
  className,
  icon,
  title,
  subtitle,
  align,
}: {
  className: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  align?: 'right';
}) => (
  <div className={`absolute z-10 hidden w-[148px] rounded-2xl border border-[#dbe4f2] bg-white/92 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0b1f3b]/92 sm:block ${className} ${align === 'right' ? 'text-right' : ''}`}>
    <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf3ff] dark:bg-[#2f80ed]/14">{icon}</span>
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a96b3] dark:text-white/42">{subtitle}</p>
      </div>
    </div>
  </div>
);

const HeroFlowStep = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#edf1f8] bg-[#f8faff] px-4 py-3 dark:border-white/10 dark:bg-white/5">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2f80ed] shadow-sm dark:bg-[#10264d] dark:text-[#8bbdff]">{icon}</span>
    <p className="text-xs font-black">{label}</p>
  </div>
);



const PipelineShowcaseSection = ({ t, noMotion }: { t: (key: string) => string; noMotion?: boolean }) => {
  const stages = [
    { icon: <Database size={20} />, title: t('home.pipeline.prepare.title'), label: t('home.pipeline.ingest'), tone: 'blue' },
    { icon: <GitBranch size={20} />, title: t('home.pipeline.rules.title'), label: t('home.pipeline.scan'), tone: 'green' },
    { icon: <FileText size={20} />, title: t('home.pipeline.report.title'), label: t('home.pipeline.publish'), tone: 'purple' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-[28px] bg-[#111b3f] p-6 text-white shadow-xl shadow-[#111b3f]/12 sm:p-8 lg:p-10"
    >
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8bbdff]">{t('home.pipeline.eyebrow')}</p>
          <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">{t('home.pipeline.title')}</h2>
          <div className="mt-7 grid grid-cols-3 gap-3">
            <PipelineMetric value="01" label={t('home.pipeline.ingest')} />
            <PipelineMetric value="02" label={t('home.pipeline.scan')} />
            <PipelineMetric value="03" label={t('home.pipeline.publish')} />
          </div>
        </div>

        <div className="relative min-h-[330px] overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(47,128,237,0.22),transparent_30%),radial-gradient(circle_at_84%_76%,rgba(35,209,139,0.16),transparent_28%)]" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="rounded-full bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
              {t('home.pipeline.traceable')}
            </span>
            <span className="rounded-full bg-[#23d18b]/14 px-3 py-1.5 text-[10px] font-black uppercase text-[#67e8b9]">
              {t('home.pipeline.readyOutput')}
            </span>
          </div>

          <div className="relative mt-10 grid gap-4 md:grid-cols-3">
            <motion.span
              animate={noMotion ? undefined : { scaleX: [0.1, 1, 0.1], opacity: [0.35, 1, 0.35] }}
              transition={noMotion ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-[12%] right-[12%] top-12 hidden h-px origin-left bg-[#8bbdff]/45 md:block"
            />
            {stages.map((stage, index) => (
              <PipelineStageNode key={stage.title} index={index} {...stage} noMotion={noMotion} />
            ))}
          </div>

          <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
            <PipelineSignal icon={<UploadCloud size={16} />} label={t('home.pipeline.package')} />
            <PipelineSignal icon={<Shield size={16} />} label={t('home.pipeline.visible')} />
            <PipelineSignal icon={<Brain size={16} />} label={t('home.pipeline.readyOutput')} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PipelineMetric = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
    <p className="text-2xl font-black">{value}</p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
  </div>
);

const PipelineStageNode = ({
  icon,
  title,
  label,
  tone,
  index,
  noMotion,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  tone: 'blue' | 'green' | 'purple';
  index: number;
  noMotion?: boolean;
}) => {
  const toneClass =
    tone === 'green'
      ? 'bg-[#23d18b]/14 text-[#67e8b9]'
      : tone === 'purple'
        ? 'bg-[#7c3aed]/16 text-[#c4b5fd]'
        : 'bg-[#2f80ed] text-white';

  return (
    <motion.div
      initial={noMotion ? false : { opacity: 0, y: 18 }}
      whileInView={noMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.38, delay: index * 0.08 }}
      className="relative z-10 rounded-[22px] border border-white/10 bg-[#172653] p-5 shadow-lg shadow-black/10"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</span>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{label}</p>
      <h3 className="mt-2 text-base font-black">{title}</h3>
    </motion.div>
  );
};

const PipelineSignal = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[#8bbdff]">{icon}</span>
    <p className="truncate text-xs font-black text-white/65">{label}</p>
  </div>
);

const ReportsShowcaseSection = ({ t }: { t: (key: string) => string }) => (
  <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-[28px] bg-[#111b3f] p-7 text-white shadow-xl shadow-[#111b3f]/12 sm:p-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(47,128,237,0.2),transparent_32%)]" />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8bbdff]">{t('home.reports.eyebrow')}</p>
        <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t('home.reports.title')}</h2>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <ReportFormatTile value="PDF" label={t('home.reports.stat.pdf')} />
          <ReportFormatTile value="JSON" label={t('home.reports.stat.json')} />
          <ReportFormatTile value="P1" label={t('home.reports.stat.priority')} />
        </div>

        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.07] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8bbdff]">{t('home.reports.decisionLabel')}</p>
          <p className="mt-3 text-lg font-black leading-7">{t('home.reports.decisionShort')}</p>
        </div>
      </div>
    </motion.div>

    <div className="rounded-[28px] border border-[#dbe4f2] bg-white p-4 shadow-xl shadow-[#1d2b5b]/8 dark:border-white/10 dark:bg-[#101d3a] sm:p-5">
      <ReportDecisionPreview t={t} />
    </div>
  </div>
);

const ReportFormatTile = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
    <p className="text-2xl font-black">{value}</p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
  </div>
);

const ReportDecisionPreview = ({ t }: { t: (key: string) => string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-70px' }}
    transition={{ duration: 0.45 }}
    className="overflow-hidden rounded-[24px] border border-[#dbe4f2] bg-[#f8faff] dark:border-white/10 dark:bg-[#0b1f3b]"
  >
    <div className="h-1.5 bg-[linear-gradient(90deg,#23d18b_0%,#2f80ed_34%,#f59e0b_68%,#e54848_100%)]" />
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f8] bg-white px-5 py-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/14 dark:text-[#8bbdff]">
          <FileText size={20} />
        </span>
        <div>
          <p className="text-sm font-black">{t('home.reportPreview.title')}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a96b3] dark:text-white/42">Jira Cloud readiness PDF</p>
        </div>
      </div>
      <span className="rounded-full bg-[#fff0f0] px-3 py-1.5 text-[10px] font-black uppercase text-[#c43d3d] dark:bg-[#e54848]/12 dark:text-red-300">
        {t('home.reportPreview.blocker')}
      </span>
    </div>

    <div className="grid gap-4 p-5 lg:grid-cols-[150px_1fr]">
      <div className="grid place-items-center rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-white/5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a96b3] dark:text-white/42">{t('home.preview.score')}</p>
          <p className="mt-2 text-5xl font-black text-[#111b3f] dark:text-white">30</p>
          <p className="text-xs font-black text-[#8a96b3] dark:text-white/42">/100</p>
        </div>
      </div>
      <div className="grid gap-3">
        <ReportPriorityRow label="ScriptRunner" value={t('home.reportPreview.blocker')} tone="red" />
        <ReportPriorityRow label={t('home.preview.marketplace')} value={t('home.reportPreview.major')} tone="amber" />
        <ReportPriorityRow label="Cloud readiness" value={t('home.reportPreview.action')} tone="blue" />
      </div>
    </div>

    <div className="grid gap-3 border-t border-[#edf1f8] bg-white px-5 py-4 dark:border-white/10 dark:bg-white/5 sm:grid-cols-3">
      <ReportOutputPill icon={<Brain size={16} />} label={t('home.reportPreview.badge.summary')} />
      <ReportOutputPill icon={<Shield size={16} />} label={t('home.reportPreview.badge.priority')} />
      <ReportOutputPill icon={<FileText size={16} />} label={t('home.reportPreview.badge.owner')} />
    </div>
  </motion.div>
);

const ReportPriorityRow = ({ label, value, tone }: { label: string; value: string; tone: 'red' | 'amber' | 'blue' }) => {
  const toneClass =
    tone === 'red'
      ? 'bg-[#fff0f0] text-[#c43d3d] dark:bg-[#e54848]/12 dark:text-red-300'
      : tone === 'amber'
        ? 'bg-[#fff7e6] text-[#b35b00] dark:bg-[#f59e0b]/12 dark:text-[#ffbe4d]'
        : 'bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/14 dark:text-[#8bbdff]';

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf1f8] bg-white px-4 py-4 dark:border-white/10 dark:bg-white/5">
      <span className="min-w-0 truncate text-sm font-black">{label}</span>
      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${toneClass}`}>{value}</span>
    </div>
  );
};

const ReportOutputPill = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#edf1f8] bg-[#f8faff] px-3 py-3 dark:border-white/10 dark:bg-[#0b1f3b]">
    <span className="text-[#2f80ed] dark:text-[#8bbdff]">{icon}</span>
    <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[#64708d] dark:text-white/48">{label}</p>
  </div>
);

export default Home;
