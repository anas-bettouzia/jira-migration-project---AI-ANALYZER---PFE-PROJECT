import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Database,
  FileText,
  GitBranch,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sun,
  UploadCloud,
  X,
} from 'lucide-react';

import logoSpectrumDark from '../../assets/img/logo-spectrum-groupe-darkmode.png';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';
import LoginModal from '../auth/LoginModal';
import { MainSidebar } from '../../shared/components/MainSidebar';
import { useAuthStore } from '../../store/useAuthStore';

const THEME_KEY = 'jira-migration-theme';

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLight, setIsLight] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) return savedTheme === 'light';
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const logo = isLight ? logoSpectrum : logoSpectrumDark;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !isLight);
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  }, [isLight]);

  const featureCards = useMemo(
    () => [
      {
        icon: <UploadCloud size={24} />,
        title: 'Import multi-format',
        desc: 'Upload Jira Data Center exports, Groovy scripts, XML files, and ZIP packages into one audit flow.',
        tone: 'blue',
      },
      {
        icon: <Shield size={24} />,
        title: 'Risk detection',
        desc: 'Identify deprecated APIs, custom-field conflicts, marketplace gaps, and cloud blockers early.',
        tone: 'green',
      },
      {
        icon: <Brain size={24} />,
        title: 'AI recommendations',
        desc: 'Generate structured guidance backed by Atlassian migration logic and internal compatibility rules.',
        tone: 'purple',
      },
    ] as const,
    [],
  );

  const handleMainAction = () => {
    if (isAuthenticated) {
      navigate('/analysis');
      return;
    }
    setIsModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      {isAuthenticated && <MainSidebar activePage="overview" />}

      <div className={isAuthenticated ? 'md:pl-[72px]' : ''}>
        <nav
          className={`fixed left-0 top-0 z-40 w-full transition-all duration-300 ${
            isAuthenticated ? 'md:left-[72px] md:w-[calc(100%-72px)]' : ''
          } ${
            scrolled
              ? 'border-b border-[#dce4f4] bg-white/92 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0c1730]/92'
              : 'border-b border-transparent bg-transparent py-5'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <button onClick={() => navigate('/')} className="flex items-center gap-3" aria-label="Go to home">
              <img src={logo} alt="Spectrum Groupe" className={`${isLight ? 'h-9' : 'h-12'} w-auto object-contain`} />
            </button>

            <div className="hidden items-center gap-8 text-sm font-bold text-[#64708d] dark:text-white/58 lg:flex">
              <button onClick={() => scrollToSection('features')} className="transition hover:text-[#2f80ed]">Features</button>
              <button onClick={() => scrollToSection('pipeline')} className="transition hover:text-[#2f80ed]">Pipeline</button>
              <button onClick={() => scrollToSection('reports')} className="transition hover:text-[#2f80ed]">Reports</button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70 lg:hidden"
                aria-label="Toggle navigation"
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <button
                onClick={() => setIsLight((value) => !value)}
                className="flex items-center gap-2 rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] px-3 py-2 text-xs font-bold text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                aria-label="Toggle color mode"
              >
                <span className="flex h-5 w-9 items-center rounded-full bg-[#dce4f1] p-0.5 dark:bg-[#2c3a57]">
                  <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isLight ? 'translate-x-0' : 'translate-x-4'}`} />
                </span>
                {isLight ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} />}
                <span className="hidden sm:inline">{isLight ? 'Light' : 'Dark'}</span>
              </button>

              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/analysis')}
                    className="rounded-xl bg-[#2f80ed] px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#256fdb]"
                  >
                    Open analysis
                  </button>
                  <button
                    onClick={logout}
                    className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0ef] text-[#64708d] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:text-white/60 dark:hover:bg-red-500/10 dark:hover:text-red-300 sm:flex"
                    aria-label="Log out"
                  >
                    <LogOut size={17} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="rounded-xl bg-[#111b3f] px-4 py-2 text-sm font-black text-white transition hover:bg-[#1d2b5b] dark:bg-white dark:text-[#111b3f]"
                >
                  Sign in
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
                <button onClick={() => scrollToSection('features')} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-[#64708d] hover:bg-[#f8faff] dark:text-white/65 dark:hover:bg-white/6">Features</button>
                <button onClick={() => scrollToSection('pipeline')} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-[#64708d] hover:bg-[#f8faff] dark:text-white/65 dark:hover:bg-white/6">Pipeline</button>
                <button onClick={() => scrollToSection('reports')} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-[#64708d] hover:bg-[#f8faff] dark:text-white/65 dark:hover:bg-white/6">Reports</button>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <main className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <section className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.03fr_0.97fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#bdd5fa] bg-[#f5f9ff] px-4 py-2 text-xs font-black text-[#2f80ed] dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]">
                <span className="h-2 w-2 rounded-full bg-[#2f80ed]" />
                AI Migration Solutions
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                Audit your Jira Cloud migration before it becomes risky.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#64708d] dark:text-white/62">
                Upload your Jira Data Center package, detect compatibility blockers, and generate a decision-ready migration report from one controlled pipeline.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleMainAction}
                  className="group flex items-center justify-center gap-3 rounded-xl bg-[#2f80ed] px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-[#256fdb]"
                >
                  {isAuthenticated ? 'Start a new analysis' : 'Start migration audit'}
                  <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => scrollToSection('pipeline')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#d7e0ef] bg-white px-6 py-4 text-sm font-black text-[#64708d] transition hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8"
                >
                  View pipeline
                </button>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 border-t border-[#dce4f4] pt-7 dark:border-white/10">
                <HeroMetric value="3" label="Pipeline stages" />
                <HeroMetric value="PDF" label="Report output" />
                <HeroMetric value="<2m" label="Fast preview" />
              </div>
            </motion.div>

            <HeroProductPreview />
          </section>

          <section className="mx-auto mt-8 grid max-w-7xl gap-3 md:grid-cols-3">
            <ProductHighlight icon={<Shield size={18} />} label="Secure intake" text="Files move through an authenticated analysis flow." />
            <ProductHighlight icon={<Brain size={18} />} label="AI assisted" text="Recommendations stay visible and reviewable." />
            <ProductHighlight icon={<FileText size={18} />} label="Report ready" text="Outputs are structured for migration decisions." />
          </section>

          <section id="features" className="mx-auto mt-24 max-w-7xl">
            <SectionHeading eyebrow="Features" title="A clearer way to prepare Jira Cloud migration." />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureCards.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </section>

          <section id="pipeline" className="mx-auto mt-24 max-w-7xl overflow-hidden rounded-[22px] bg-[#111b3f] p-6 text-white shadow-xl shadow-[#111b3f]/10 sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8bbdff]">Pipeline</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">From package upload to report-ready recommendations.</h2>
                <p className="mt-4 text-sm leading-7 text-white/58">
                  The pipeline keeps technical parsing, compatibility checks, and report generation visible from the first upload to the final decision.
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/7 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/35">Operational promise</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Every stage produces traceable output, so migration teams can review what happened before acting on AI recommendations.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <PipelineCard step="01" icon={<Database size={22} />} title="Prepare data" desc="Normalize exports, scripts, and metadata into a readable package." active />
                <PipelineCard step="02" icon={<GitBranch size={22} />} title="Map rules" desc="Compare detected patterns with cloud migration compatibility checks." />
                <PipelineCard step="03" icon={<FileText size={22} />} title="Generate report" desc="Turn findings into a readable action plan for migration stakeholders." />
              </div>
            </div>
          </section>

          <section id="reports" className="mx-auto mt-24 max-w-7xl rounded-[22px] border border-[#dbe4f2] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#101d3a] sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2f80ed]">Reports</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">Decision-ready outputs for migration teams.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64708d] dark:text-white/58">
                  Export findings as structured reports that can be reviewed by administrators, project owners, and cloud migration stakeholders.
                </p>
                <button
                  onClick={handleMainAction}
                  className="mt-6 inline-flex items-center justify-center gap-3 rounded-xl bg-[#2f80ed] px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#256fdb]"
                >
                  Open analysis
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <ReportArtifact icon={<Brain size={18} />} title="Executive summary" text="Clear AI summary for decision makers." />
                <ReportArtifact icon={<Shield size={18} />} title="Risk register" text="Blockers, review items, and cloud readiness indicators." />
                <ReportArtifact icon={<FileText size={18} />} title="Export formats" text="PDF and JSON outputs for review or integration." />
              </div>
            </div>
          </section>

          <section className="mx-auto mt-10 max-w-7xl rounded-[22px] bg-[#2f80ed] p-6 text-white shadow-xl shadow-blue-500/20 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">Next step</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Ready to audit your migration package?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">
                  Start with one export package and turn migration uncertainty into a structured readiness report.
                </p>
              </div>
              <button
                onClick={handleMainAction}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 text-sm font-black text-[#111b3f] transition hover:-translate-y-0.5"
              >
                {isAuthenticated ? 'Open analysis' : 'Sign in to start'}
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        </main>

        <footer className="border-t border-[#dce4f4] px-6 py-8 text-center dark:border-white/10">
          <img src={logo} alt="Spectrum Groupe" className={`${isLight ? 'h-7' : 'h-10'} mx-auto w-auto object-contain opacity-70`} />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#8a96b3] dark:text-white/40">
            © 2026 Spectrum Groupe · Jira Cloud Migration Intelligence
          </p>
        </footer>
      </div>

      <AnimatePresence>
        {isModalOpen && <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

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

const HeroProductPreview = () => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.08 }}
    className="rounded-[22px] bg-white p-4 shadow-xl shadow-[#1d2b5b]/8 ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10"
  >
    <div className="overflow-hidden rounded-[18px] border border-[#dbe4f2] dark:border-white/10">
      <div className="flex items-center justify-between bg-[#f8faff] px-5 py-4 dark:bg-white/5">
        <div>
          <p className="text-xs font-black uppercase text-[#8a96b3] dark:text-white/45">Live report preview</p>
          <h2 className="mt-1 text-lg font-black">Spectrum-Prod-DC</h2>
        </div>
        <span className="rounded-full bg-[#e9fbf4] px-3 py-1.5 text-[10px] font-black uppercase text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]">
          Ready
        </span>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[160px_1fr]">
        <div className="rounded-2xl bg-[#eaf3ff] p-5 text-center text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]">
          <p className="text-[10px] font-black uppercase opacity-70">Migration score</p>
          <p className="mt-3 text-5xl font-black">84</p>
          <p className="text-xs font-black opacity-60">/100 readiness</p>
        </div>

        <div className="space-y-3">
          <PreviewRow label="Data preparation" value="Complete" tone="green" progress={100} />
          <PreviewRow label="Compatibility analysis" value="2 blockers" tone="red" progress={72} />
          <PreviewRow label="AI report generation" value="Ready" tone="blue" progress={100} />
        </div>
      </div>

      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        <PreviewFinding title="ScriptRunner update" text="Upgrade path required before migration." tone="warning" />
        <PreviewFinding title="Marketplace apps" text="4 apps mapped to Cloud equivalents." tone="success" />
      </div>

      <div className="m-5 mt-0 rounded-2xl bg-[#111b3f] p-4 text-white dark:bg-[#071126]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2f80ed]">
              <Brain size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-[#8bbdff]">AI recommendation</p>
              <p className="truncate text-xs text-white/75">Prioritize app compatibility and automation review.</p>
            </div>
          </div>
          <span className="rounded-lg bg-white/8 px-3 py-2 text-[10px] font-black uppercase text-white/70">Report</span>
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

const PipelineCard = ({ step, icon, title, desc, active }: { step: string; icon: React.ReactNode; title: string; desc: string; active?: boolean }) => (
  <div className={`rounded-2xl border p-5 transition ${active ? 'border-[#2f80ed]/45 bg-[#2f80ed]/14' : 'border-white/10 bg-white/7'}`}>
    <div className="flex items-start gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#2f80ed] text-white' : 'bg-white/8 text-[#8bbdff]'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-white/35">{step}</span>
          {active && <span className="rounded-full bg-[#23d18b]/16 px-2 py-0.5 text-[9px] font-black uppercase text-[#67e8b9]">First stage</span>}
        </div>
        <h3 className="mt-1 text-sm font-black">{title}</h3>
        <p className="mt-2 text-xs leading-5 text-white/55">{desc}</p>
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