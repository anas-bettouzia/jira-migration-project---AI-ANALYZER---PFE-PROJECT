import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Archive,
  ArrowUpToLine,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileJson,
  FileText,
  Gauge,
  HelpCircle,
  Layers3,
  Loader2,
  Moon,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  X,
} from 'lucide-react';

import { FileUploader } from '../../shared/components/FileUploader';
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher';
import { MainSidebar } from '../../shared/components/MainSidebar';
import { useI18n } from '../../i18n';
import { useJobStatus } from '../../hooks/useJobStatus';
import { analysisService, type AnalysisJob } from '../../services/analysisService';
import { reportService } from '../../services/reportService';
import logoSpectrumDark from '../../assets/img/logo-spectrum-groupe-darkmode.png';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';

type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string | undefined;
type Translate = (key: string, values?: Record<string, string | number>) => string;

export const AnalysisPage: React.FC = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [analysisName, setAnalysisName] = useState('');
  const [selectedFilename, setSelectedFilename] = useState('');
  const [analysisDraftKey, setAnalysisDraftKey] = useState(0);
  const [recentJobs, setRecentJobs] = useState<AnalysisJob[]>([]);
  const [recentJobsHasMore, setRecentJobsHasMore] = useState(false);
  const [recentJobsLimit, setRecentJobsLimit] = useState(5);
  const [recentJobsLoading, setRecentJobsLoading] = useState(false);
  const [hasSelectedPackage, setHasSelectedPackage] = useState(false);
  const [isLight, setIsLight] = useState(() => {
    const savedTheme = localStorage.getItem('jira-migration-theme');
    if (savedTheme) return savedTheme === 'light';
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [supportPanel, setSupportPanel] = useState<'help' | 'changelog' | null>(null);
  const jobStatus = useJobStatus(jobId);
  const analysisNameRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t, language } = useI18n();

  const result = jobStatus?.result;
  const summary = result?.summary;
  const reportId = result?.report_id;
  const activeStage = getActiveStage(jobStatus?.status);

  const progress = useMemo(() => {
    if (!jobStatus?.status) return 10;
    if (jobStatus.status === 'QUEUED') return 25;
    if (jobStatus.status === 'RUNNING') return 66;
    if (jobStatus.status === 'COMPLETED') return 100;
    if (jobStatus.status === 'FAILED') return 100;
    return 45;
  }, [jobStatus?.status]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !isLight);
    localStorage.setItem('jira-migration-theme', isLight ? 'light' : 'dark');
  }, [isLight]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncSidebarState = () => {
      if (!mediaQuery.matches) setIsSidebarCollapsed(false);
    };

    syncSidebarState();
    mediaQuery.addEventListener('change', syncSidebarState);

    return () => mediaQuery.removeEventListener('change', syncSidebarState);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchRecentJobs = async () => {
      setRecentJobsLoading(true);
      try {
        const [jobs, reportsResponse] = await Promise.all([
          analysisService.listJobs(recentJobsLimit),
          reportService.listReports(),
        ]);
        const activeReportIds = new Set(
          (reportsResponse.reports ?? [])
            .map((report) => report.report_id)
            .filter((reportId): reportId is string => Boolean(reportId)),
        );
        const visibleJobs = jobs.filter((job) => {
          const reportIdFromJob = job.result?.report_id;
          return !reportIdFromJob || activeReportIds.has(reportIdFromJob);
        });

        if (isMounted) {
          setRecentJobs(visibleJobs);
          setRecentJobsHasMore(jobs.length >= recentJobsLimit);
        }
      } catch (error) {
        console.error('Erreur chargement analyses recentes:', error);
        if (isMounted) {
          setRecentJobs([]);
          setRecentJobsHasMore(false);
        }
      } finally {
        if (isMounted) setRecentJobsLoading(false);
      }
    };

    fetchRecentJobs();

    return () => {
      isMounted = false;
    };
  }, [jobId, jobStatus?.status, recentJobsLimit]);

  const startNewAnalysis = () => {
    setJobId(null);
    setAnalysisName('');
    setSelectedFilename('');
    setHasSelectedPackage(false);
    setAnalysisDraftKey((key) => key + 1);
    window.setTimeout(() => analysisNameRef.current?.focus(), 0);
  };

  const handleUploadSuccess = (id: string) => {
    if (!analysisName.trim() && selectedFilename) {
      setAnalysisName(selectedFilename.replace(/\.[^/.]+$/, '').trim());
    }
    setJobId(id);
    setHasSelectedPackage(false);
  };

  useEffect(() => {
    if (!jobStatus?.payload) return;

    const incomingName = jobStatus.payload.analysis_name;
    if (typeof incomingName === 'string' && incomingName.trim()) {
      setAnalysisName(incomingName.trim());
      return;
    }

    if (!analysisName.trim()) {
      const filename = jobStatus.payload.filename;
      if (typeof filename === 'string' && filename.trim()) {
        setAnalysisName(filename.replace(/\.[^/.]+$/, '').trim());
      }
    }
  }, [jobStatus?.payload, analysisName]);

  const handleRecentJobClick = (job: AnalysisJob) => {
    const reportIdFromJob = job.result?.report_id;
    if (reportIdFromJob && job.status === 'COMPLETED') {
      navigate(`/reports/${reportIdFromJob}`);
      return;
    }

    setJobId(job.job_id);
    setAnalysisName(getJobTitle(job));
    setHasSelectedPackage(false);
  };

  const handleDeleteRecentReport = async (job: AnalysisJob) => {
    const reportIdToDelete = job.result?.report_id;
    if (!reportIdToDelete) return;

    try {
      await analysisService.deleteReport(reportIdToDelete);
      setRecentJobs((jobs) => jobs.filter((item) => item.result?.report_id !== reportIdToDelete));

      if (reportId === reportIdToDelete) {
        setJobId(null);
        setAnalysisName('');
      }
    } catch (error) {
      console.error('Erreur suppression rapport:', error);
      alert(t('analysis.deleteError'));
    }
  };

  const handleArchiveRecentReport = async (job: AnalysisJob) => {
    const reportIdToArchive = job.result?.report_id;
    if (!reportIdToArchive) return;

    try {
      await analysisService.archiveReport(reportIdToArchive);
      setRecentJobs((jobs) => jobs.filter((item) => item.result?.report_id !== reportIdToArchive));

      if (reportId === reportIdToArchive) {
        setJobId(null);
        setAnalysisName('');
      }
    } catch (error) {
      console.error('Erreur archivage rapport:', error);
      alert(t('analysis.archiveError'));
    }
  };

  const handleLoadMoreRecentJobs = () => {
    setRecentJobsLimit((limit) => limit + 5);
  };

  const downloadFile = async (type: 'json' | 'pdf') => {
    if (!reportId) return;
    try {
      await reportService.downloadReport(reportId, type, language);
    } catch (error) {
      console.error(`Erreur telechargement ${type}:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      <div className="flex min-h-screen">
        <MainSidebar activePage="analysis" />

        <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-0 md:pl-[88px]">
          <header className="sticky top-0 z-30 border-b border-[#dce4f4] bg-white/95 backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-[#0c1730]/95">
            <div className="flex h-[62px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-3"
                  aria-label="Go to home"
                >
                  <img
                    src={isLight ? logoSpectrum : logoSpectrumDark}
                    alt="Jira Migration Spectrum Groupe"
                    className={`${isLight ? 'h-8 sm:h-9' : 'h-10 sm:h-12'} max-w-[145px] object-contain sm:max-w-none`}
                  />
                </button>
                <div className="hidden h-8 w-px bg-[#d4deee] sm:block" />
                <div className="hidden items-center gap-2 text-sm sm:flex">
                  <span className="text-[#8a96b3] dark:text-white/55">{t('common.platform')}</span>
                  <strong>{t('analysis.productName')}</strong>
                </div>
                {!jobId && (
                  <div className="hidden items-center gap-2 rounded-full border border-[#bdd5fa] bg-[#f5f9ff] px-4 py-1.5 text-xs font-bold text-[#2f80ed] lg:flex dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]">
                    <span className="h-2 w-2 rounded-full bg-[#2f80ed]" />
                    {t('common.readyToAnalyse')}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <LanguageSwitcher className="hidden sm:flex" />
                <button
                  onClick={() => setIsLight((value) => !value)}
                  className="hidden items-center gap-2 rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] px-3 py-2 text-xs font-bold text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70 sm:flex"
                  aria-label={t('common.toggleColorMode')}
                >
                  <span className="flex h-5 w-9 items-center rounded-full bg-[#dce4f1] p-0.5 dark:bg-[#2c3a57]">
                    <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isLight ? 'translate-x-0' : 'translate-x-4'}`} />
                  </span>
                  {isLight ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} />}
                  {isLight ? t('common.light') : t('common.dark')}
                </button>
                <button
                  onClick={startNewAnalysis}
                  className="hidden items-center gap-2 rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] px-4 py-2 text-sm font-bold text-[#64708d] transition dark:border-white/10 dark:bg-white/5 dark:text-white/70 sm:flex"
                >
                  <ArrowUpToLine size={17} />
                  {t('common.uploadData')}
                </button>
                <button
                  onClick={() => reportId && navigate(`/reports/${reportId}`)}
                  disabled={!reportId}
                  className="flex items-center gap-2 rounded-xl bg-[#2f80ed] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">{t('common.viewReport')}</span>
                  <span className="sm:hidden">{t('common.report')}</span>
                </button>
              </div>
            </div>
          </header>

          <main
            className="grid flex-1 grid-cols-1 transition-[grid-template-columns] duration-300 lg:grid-cols-[var(--secondary-sidebar)_1fr]"
            style={{ '--secondary-sidebar': isSidebarCollapsed ? '88px' : '280px' } as React.CSSProperties}
          >
            <SecondarySidebar
              analysisName={analysisName}
              isCollapsed={isSidebarCollapsed}
              hasSelectedPackage={hasSelectedPackage}
              jobId={jobId}
              progress={progress}
              recentJobs={recentJobs}
              recentJobsHasMore={recentJobsHasMore}
              recentJobsLoading={recentJobsLoading}
              startNewAnalysis={startNewAnalysis}
              onArchiveRecentReport={handleArchiveRecentReport}
              onDeleteRecentReport={handleDeleteRecentReport}
              onLoadMoreRecentJobs={handleLoadMoreRecentJobs}
              onOpenChangelog={() => setSupportPanel('changelog')}
              onOpenHelp={() => setSupportPanel('help')}
              onRecentJobClick={handleRecentJobClick}
              setIsCollapsed={setIsSidebarCollapsed}
              status={jobStatus?.status}
            />

            <section className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-4">
              <AnimatePresence mode="wait">
                {!jobId ? (
                  <motion.div
                    key="intake"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="mx-auto max-w-[1015px]"
                  >
                    <div className="overflow-hidden rounded-[18px] bg-white shadow-sm ring-1 ring-[#dbe4f2] transition-colors duration-300 dark:bg-[#101d3a] dark:ring-white/10">
                      <div className="grid lg:grid-cols-[1fr_375px]">
                        <div className="p-6 sm:p-8">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-full bg-[#2f80ed] px-5 py-1.5 text-[10px] font-black uppercase text-white">{t('analysis.importStep')}</span>
                            <span className="h-px w-32 bg-[#bdd5fa]" />
                          </div>

                          <h1 className="text-[22px] font-black leading-tight sm:text-2xl">{t('analysis.importTitle')}</h1>
                          <p className="mt-1 max-w-2xl text-sm leading-5 text-[#64708d] dark:text-white/60">
                            {t('analysis.importText')}
                          </p>

                          <label className="mt-3 block text-xs font-black">{t('analysis.name')}</label>
                          <input
                            ref={analysisNameRef}
                            value={analysisName}
                            onChange={(event) => setAnalysisName(event.target.value)}
                            placeholder={t('analysis.namePlaceholder')}
                            className="mt-2 h-11 w-full rounded-xl border border-[#d6e0ee] bg-[#f8faff] px-4 text-sm font-semibold outline-none transition placeholder:text-[#c4ccdc] focus:border-[#2f80ed] focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:bg-[#0c1730] dark:focus:ring-blue-500/20"
                          />

                          <div className="mt-3">
                            <FileUploader
                              key={analysisDraftKey}
                              analysisName={analysisName}
                              onFileSelectionChange={(hasFile, fileName) => {
                                setHasSelectedPackage(hasFile);
                                setSelectedFilename(fileName ?? '');
                              }}
                              onUploadSuccess={handleUploadSuccess}
                            />
                          </div>
                        </div>

                        <PipelinePanel activeStage={activeStage} status={jobStatus?.status} />
                      </div>
                    </div>
                    <ResourceCards />
                  </motion.div>
                ) : (
                  <motion.div
                    key="status"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="mx-auto max-w-[1015px] space-y-5"
                  >
                    <div className="overflow-hidden rounded-[18px] bg-white shadow-sm ring-1 ring-[#dbe4f2] transition-colors duration-300 dark:bg-[#101d3a] dark:ring-white/10">
                      <div className="grid lg:grid-cols-[1fr_375px]">
                        <div className="p-6 sm:p-8">
                          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-full bg-[#2f80ed] px-5 py-1.5 text-[10px] font-black uppercase text-white">{t('analysis.stepOfTotal', { step: activeStage, total: 3 })}</span>
                                <span className="h-px w-32 bg-[#bdd5fa]" />
                              </div>
                              <h1 className="text-2xl font-black leading-tight">
                                {jobStatus?.status === 'COMPLETED' ? t('analysis.auditCompletedTitle') : t('analysis.pipelineProgress')}
                              </h1>
                              <p className="mt-1 max-w-xl text-sm text-[#64708d] dark:text-white/60">
                                {jobStatus?.status === 'COMPLETED'
                                  ? t('analysis.auditCompletedText')
                                  : t('analysis.pipelineProgressText', { name: analysisName || selectedFilename.replace(/\.[^/.]+$/, '') || t('analysis.migrationPackage') })}
                              </p>
                            </div>
                            <StatusBadge status={jobStatus?.status} />
                          </div>

                          <div className="rounded-2xl border border-[#dbe4f2] bg-[#f8faff] p-5 transition-colors duration-300 dark:border-white/10 dark:bg-white/5">
                            <div className="mb-3 flex items-center justify-between text-xs font-black uppercase text-[#8a96b3] dark:text-white/45">
                              <span>{t('analysis.jobProgress')}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-[#e3ebf8]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={`h-full rounded-full ${jobStatus?.status === 'FAILED' ? 'bg-[#ef4444]' : jobStatus?.status === 'COMPLETED' ? 'bg-[#23d18b]' : 'bg-[#2f80ed]'}`}
                              />
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <StageChip label={t('analysis.dataReady')} active={activeStage >= 1} />
                              <StageChip label={t('analysis.compatibility')} active={activeStage >= 2} />
                              <StageChip label={t('analysis.aiReport')} active={activeStage >= 3} />
                            </div>
                          </div>

                          {jobStatus?.status === 'RUNNING' && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 rounded-2xl border border-[#bdd5fa] bg-[#f5f9ff] p-4 dark:border-[#2f80ed]/25 dark:bg-[#2f80ed]/8"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h2 className="text-sm font-black text-[#111b3f] dark:text-white">{t('analysis.runningAuditTitle')}</h2>
                                  <p className="mt-1 text-xs leading-5 text-[#64708d] dark:text-white/58">{t('analysis.runningAuditText')}</p>
                                </div>
                                <Loader2 size={18} className="mt-1 shrink-0 animate-spin text-[#2f80ed] dark:text-[#8bbdff]" />
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <RunningCheck icon={<Layers3 size={14} />} label={t('analysis.runningCheckComponents')} />
                                <RunningCheck icon={<FileText size={14} />} label={t('analysis.runningCheckScripts')} />
                                <RunningCheck icon={<Gauge size={14} />} label={t('analysis.runningCheckWorkflows')} />
                              </div>
                            </motion.div>
                          )}

                          {jobStatus?.status === 'COMPLETED' && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 flex items-start gap-3 rounded-2xl border border-[#9be7c4] bg-[#effdf7] p-4 text-[#159866] dark:border-[#23d18b]/30 dark:bg-[#23d18b]/10 dark:text-[#67e8b9]"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#159866] shadow-sm dark:bg-[#0c1730] dark:text-[#67e8b9]">
                                <CheckCircle2 size={18} />
                              </span>
                              <div>
                                <h2 className="text-sm font-black text-[#111b3f] dark:text-white">{t('analysis.reportReadyBannerTitle')}</h2>
                                <p className="mt-1 text-xs leading-5 text-[#64708d] dark:text-white/58">{t('analysis.reportReadyBannerText')}</p>
                              </div>
                            </motion.div>
                          )}

                          {jobStatus?.status === 'COMPLETED' && (
                            <div className="mt-5 grid gap-4 sm:grid-cols-4">
                              <StatCard label={t('analysis.migrationScore')} value={`${summary?.migration_score ?? 0}%`} tone="blue" />
                              <StatCard label={t('analysis.blockers')} value={summary?.blocker_count ?? 0} tone="red" />
                              <StatCard label={t('analysis.components')} value={summary?.total_components ?? 0} tone="slate" />
                              <StatCard label={t('analysis.aiValidated')} value={t('common.yes')} tone="green" />
                            </div>
                          )}

                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                            <button
                              onClick={startNewAnalysis}
                              className="flex items-center gap-2 rounded-xl border border-[#d7e0ef] px-4 py-3 font-bold text-[#64708d] transition dark:border-white/10 dark:text-white/65 dark:hover:bg-white/5"
                            >
                              <RotateCcw size={16} />
                              {t('analysis.newAudit')}
                            </button>
                            {jobStatus?.status === 'COMPLETED' && (
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => downloadFile('pdf')} className="flex items-center gap-2 rounded-xl border border-[#d7e0ef] px-4 py-3 font-bold text-[#64708d] transition dark:border-white/10 dark:text-white/65 dark:hover:bg-white/5">
                                  <Download size={16} />
                                  PDF
                                </button>
                                <button onClick={() => downloadFile('json')} className="flex items-center gap-2 rounded-xl border border-[#d7e0ef] px-4 py-3 font-bold text-[#64708d] transition dark:border-white/10 dark:text-white/65 dark:hover:bg-white/5">
                                  <FileJson size={16} />
                                  JSON
                                </button>
                                <button
                                  onClick={() => navigate(`/reports/${reportId}`)}
                                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6b8cff] to-[#c462e8] px-5 py-3 font-black text-white shadow-lg shadow-purple-500/20"
                                >
                                  {t('common.viewReport')}
                                  <ChevronRight size={17} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <PipelinePanel activeStage={activeStage} status={jobStatus?.status} />
                      </div>
                    </div>
                    <ResourceCards />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </main>
          <SupportDialog type={supportPanel} onClose={() => setSupportPanel(null)} />
        </div>
      </div>
    </div>
  );
};

const getActiveStage = (status: JobStatus) => {
  if (status === 'COMPLETED') return 3;
  if (status === 'RUNNING') return 2;
  return 1;
};

const getJobTitle = (job: AnalysisJob) => {
  const analysisName = job.payload?.analysis_name;
  if (typeof analysisName === 'string' && analysisName.trim()) return analysisName.trim();

  const filename = job.payload?.filename;
  if (filename) return filename.replace(/\.[^/.]+$/, '');
  return `Analysis ${job.job_id.substring(0, 8)}`;
};

const getJobSummary = (job: AnalysisJob) => job.result?.summary ?? {};

const getJobStatusBadgeTone = (status?: string) => {
  if (status === 'COMPLETED') return 'bg-[#e9fbf4] text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]';
  if (status === 'FAILED') return 'bg-[#fff0f0] text-[#e54848] dark:bg-red-500/10 dark:text-red-300';
  return 'bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]';
};

const formatJobDate = (value?: string) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

const getTranslatedJobStatus = (t: Translate, status?: string) => {
  if (status === 'QUEUED') return t('analysis.status.queued');
  if (status === 'STARTED') return t('analysis.status.started');
  if (status === 'RUNNING') return t('analysis.status.running');
  if (status === 'COMPLETED') return t('analysis.status.completed');
  if (status === 'FAILED') return t('analysis.status.failed');
  return status || t('analysis.initializing');
};

const SecondarySidebar = ({
  analysisName,
  hasSelectedPackage,
  isCollapsed,
  jobId,
  onArchiveRecentReport,
  onDeleteRecentReport,
  onRecentJobClick,
  progress,
  recentJobs,
  recentJobsHasMore,
  recentJobsLoading,
  onLoadMoreRecentJobs,
  onOpenChangelog,
  onOpenHelp,
  startNewAnalysis,
  setIsCollapsed,
  status,
}: {
  analysisName: string;
  hasSelectedPackage: boolean;
  isCollapsed: boolean;
  jobId: string | null;
  onArchiveRecentReport: (job: AnalysisJob) => void;
  onDeleteRecentReport: (job: AnalysisJob) => void;
  onLoadMoreRecentJobs: () => void;
  onOpenChangelog: () => void;
  onOpenHelp: () => void;
  onRecentJobClick: (job: AnalysisJob) => void;
  progress: number;
  recentJobs: AnalysisJob[];
  recentJobsHasMore: boolean;
  recentJobsLoading: boolean;
  startNewAnalysis: () => void;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  status?: string;
}) => {
  const { t } = useI18n();
  const hasActiveJob = Boolean(jobId);
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';
  const packageValue = hasActiveJob ? t('analysis.uploaded') : hasSelectedPackage ? t('analysis.packageReady') : t('analysis.waiting');
  const readinessValue = isCompleted
    ? t('analysis.reportReady')
    : isFailed
      ? t('analysis.status.failed')
      : hasActiveJob
        ? t('analysis.auditInProgress')
        : t('analysis.pending');

  return (
    <section className={`flex flex-col border-b border-[#dce4f4] bg-white transition-all duration-300 dark:border-white/10 dark:bg-[#0c1730] lg:min-h-[calc(100vh-62px)] lg:border-b-0 lg:border-r ${isCollapsed ? 'px-3 py-4 lg:items-center lg:py-5' : 'px-4 py-4 lg:py-5'}`}>
      {isCollapsed ? (
        <>
          <div className="flex flex-col items-center gap-3">
            <CompactSidebarButton icon={<PanelLeftOpen size={19} />} label={t('common.openAnalysis')} onClick={() => setIsCollapsed(false)} />
            <CompactSidebarButton icon={<Plus size={20} />} label={t('analysis.newAnalysis')} onClick={startNewAnalysis} primary />
          </div>

          <div className="mt-7 flex flex-col items-center gap-3">
            <CompactSidebarButton icon={<Gauge size={18} />} active={recentJobs.length > 0} label={t('analysis.recent')} badge={recentJobs.length || undefined} />
            <CompactSidebarButton icon={<Layers3 size={18} />} active={hasActiveJob || hasSelectedPackage} label={t('analysis.workspaceStatus')} />
            <CompactSidebarButton icon={<AlertCircle size={18} />} tone="warning" label={t('analysis.aiWarningTitle')} />
          </div>

          <div className="mt-auto flex flex-col items-center gap-3 pb-2">
            <CompactSidebarButton icon={<HelpCircle size={18} />} label={t('analysis.help')} onClick={onOpenHelp} />
            <CompactSidebarButton icon={<BookOpen size={18} />} label={t('analysis.changelog')} onClick={onOpenChangelog} />
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                onClick={startNewAnalysis}
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2f80ed] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-[#256fdb]"
              >
                <Plus size={17} />
                {t('analysis.newAnalysis')}
              </button>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#dbe4f2] text-[#64708d] transition hover:border-[#bdd5fa] hover:bg-[#f8faff] hover:text-[#2f80ed] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/6 dark:hover:text-white lg:flex"
                aria-label={t('analysis.collapseSidebar')}
                title={t('analysis.collapseSidebar')}
              >
                <PanelLeftClose size={18} />
              </button>
            </div>

            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('analysis.recent')}</p>
              <span className="rounded-full bg-[#eef4ff] px-2 py-1 text-[10px] font-black text-[#2f80ed] dark:bg-white/6 dark:text-[#8bbdff]">
                {recentJobsLoading ? t('common.loading') : recentJobs.length ? t('analysis.recentCount', { count: recentJobs.length }) : t('common.empty')}
              </span>
            </div>

            {recentJobsLoading ? (
              <div className="rounded-2xl border border-[#dbe4f2] bg-[#f8faff] p-5 text-center dark:border-white/10 dark:bg-white/5">
                <Loader2 className="mx-auto animate-spin text-[#2f80ed]" size={22} />
                <p className="mt-3 text-xs font-bold text-[#8a96b3] dark:text-white/45">{t('analysis.loadingRecent')}</p>
              </div>
            ) : recentJobs.length > 0 ? (
              <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                {recentJobs.map((job) => (
                  <RecentJobItem
                    key={job.job_id}
                    active={job.job_id === jobId}
                    job={job}
                    onArchiveReport={() => onArchiveRecentReport(job)}
                    onDeleteReport={() => onDeleteRecentReport(job)}
                    onClick={() => onRecentJobClick(job)}
                  />
                ))}
                {recentJobsHasMore && (
                  <button
                    onClick={onLoadMoreRecentJobs}
                    className="w-full rounded-xl px-3 py-2.5 text-xs font-black text-[#64708d] transition hover:bg-[#f8faff] hover:text-[#2f80ed] dark:text-white/60 dark:hover:bg-white/6 dark:hover:text-[#8bbdff]"
                  >
                    {t('analysis.loadMore')}
                  </button>
                )}
              </div>
            ) : jobId ? (
              <button className="w-full rounded-2xl border border-[#dbe4f2] bg-[#f8faff] p-4 text-left shadow-sm transition hover:border-[#bdd5fa] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#10264d] dark:text-[#8bbdff]">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#111b3f] dark:text-white">{analysisName || t('analysis.migrationPackage')}</p>
                      <p className="mt-0.5 text-xs text-[#8a96b3] dark:text-white/45">{t('analysis.currentWorkspaceAudit')}</p>
                    </div>
                  </div>
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#23d18b] shadow-[0_0_0_4px_rgba(35,209,139,0.16)]" />
                </div>
                <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase text-[#8a96b3] dark:text-white/45">
                  <span>{getTranslatedJobStatus(t, status)}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#dfe8f6] dark:bg-white/10">
                  <span className="block h-full rounded-full bg-[#2f80ed]" style={{ width: `${progress}%` }} />
                </div>
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cbd8ea] bg-[#f8faff] px-4 py-5 text-center dark:border-white/14 dark:bg-white/5">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2f80ed] shadow-sm dark:bg-[#10264d] dark:text-[#8bbdff]">
                  <Gauge size={20} />
                </span>
                <h3 className="mt-3 text-sm font-black text-[#111b3f] dark:text-white">{t('analysis.noAnalyses')}</h3>
                <p className="mt-1 text-xs leading-5 text-[#8a96b3] dark:text-white/45">
                  {t('analysis.noAnalysesText')}
                </p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-[#dbe4f2] bg-white p-3.5 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('analysis.workspaceStatus')}</p>
              <div className="mt-3">
                <WorkspaceProgressStep label={t('analysis.dataPackage')} value={packageValue} active={hasActiveJob || hasSelectedPackage} done={hasActiveJob || hasSelectedPackage} />
                <WorkspaceProgressStep label={t('analysis.cloudReadiness')} value={readinessValue} active={hasActiveJob || isCompleted} done={isCompleted} failed={isFailed} isLast />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4 pb-2 lg:mt-auto">
            <div className="rounded-xl border border-[#ffd36d]/80 bg-[#fff9e6] px-3 py-2.5 text-xs text-[#9b4f00] dark:border-[#f59e0b]/30 dark:bg-[#f59e0b]/8 dark:text-[#ffbe4d]">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 shrink-0" size={14} />
                <div className="min-w-0 flex-1">
                  <p className="leading-5 break-words">
                    <span className="font-black">{t('analysis.aiWarningTitle')}</span>{' '}
                    <span>{t('analysis.aiWarningText')}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 px-1 text-base text-[#8291b3] dark:text-white/55">
              <button onClick={onOpenHelp} className="flex items-center gap-2 transition hover:text-[#2f80ed] dark:hover:text-[#8bbdff]">
                <HelpCircle size={18} />
                {t('analysis.help')}
              </button>
              <button onClick={onOpenChangelog} className="flex items-center gap-2 transition hover:text-[#2f80ed] dark:hover:text-[#8bbdff]">
                <BookOpen size={18} />
                {t('analysis.changelog')}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const CompactSidebarButton = ({
  icon,
  label,
  active,
  badge,
  onClick,
  primary,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
  primary?: boolean;
  tone?: 'warning';
}) => (
  <button
    onClick={onClick}
    className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-[#8bbdff]/45 ${
      primary
        ? 'border-[#2f80ed] bg-[#2f80ed] text-white shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 hover:bg-[#256fdb]'
        : tone === 'warning'
          ? 'border-[#ffd36d] bg-[#fff9e6] text-[#9b4f00] dark:border-[#f59e0b]/35 dark:bg-[#f59e0b]/10 dark:text-[#ffbe4d]'
          : active
            ? 'border-[#bdd5fa] bg-[#eaf3ff] text-[#2f80ed] shadow-sm shadow-blue-500/10 dark:border-[#2f80ed]/40 dark:bg-[#10264d] dark:text-[#8bbdff]'
            : 'border-[#dbe4f2] bg-white text-[#8291b3] hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white'
    }`}
    aria-label={label}
    title={label}
    type="button"
  >
    {active && !primary && (
      <span className="absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#2f80ed] dark:bg-[#8bbdff]" />
    )}
    <span className="relative z-10">{icon}</span>
    {badge !== undefined && (
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2f80ed] px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-[#0c1730]">
        {badge}
      </span>
    )}
    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl border border-[#dbe4f2] bg-white px-3 py-2 text-xs font-black text-[#111b3f] opacity-0 shadow-xl shadow-[#111b3f]/12 transition group-hover:translate-x-1 group-hover:opacity-100 dark:border-white/10 dark:bg-[#101d3a] dark:text-white">
      {label}
    </span>
  </button>
);

const SupportDialog = ({
  type,
  onClose,
}: {
  type: 'help' | 'changelog' | null;
  onClose: () => void;
}) => {
  const { t } = useI18n();
  const isHelp = type === 'help';
  const items = isHelp
    ? [
        {
          title: t('analysis.helpItemPackageTitle'),
          text: t('analysis.helpItemPackageText'),
        },
        {
          title: t('analysis.helpItemAuditTitle'),
          text: t('analysis.helpItemAuditText'),
        },
        {
          title: t('analysis.helpItemReportTitle'),
          text: t('analysis.helpItemReportText'),
        },
      ]
    : [
        {
          title: t('analysis.changelogItemNamesTitle'),
          text: t('analysis.changelogItemNamesText'),
        },
        {
          title: t('analysis.changelogItemStatesTitle'),
          text: t('analysis.changelogItemStatesText'),
        },
        {
          title: t('analysis.changelogItemUiTitle'),
          text: t('analysis.changelogItemUiText'),
        },
      ];

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071126]/50 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={isHelp ? t('analysis.helpTitle') : t('analysis.changelogTitle')}
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-xl overflow-hidden rounded-[22px] border border-[#dbe4f2] bg-white shadow-2xl shadow-[#071126]/20 dark:border-white/10 dark:bg-[#101d3a]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e6edf7] p-5 dark:border-white/10">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]">
                  {isHelp ? <HelpCircle size={21} /> : <BookOpen size={21} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a96b3] dark:text-white/40">
                    {isHelp ? t('analysis.helpEyebrow') : t('analysis.changelogEyebrow')}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#111b3f] dark:text-white">
                    {isHelp ? t('analysis.helpTitle') : t('analysis.changelogTitle')}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-[#64708d] dark:text-white/58">
                    {isHelp ? t('analysis.helpSubtitle') : t('analysis.changelogSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dbe4f2] text-[#64708d] transition hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:text-white/55 dark:hover:bg-white/6 dark:hover:text-[#8bbdff]"
                aria-label={t('common.close')}
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-3 p-5">
              {items.map((item, index) => (
                <div key={item.title} className="flex gap-3 rounded-2xl border border-[#e6edf7] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/[0.045]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-[#2f80ed] shadow-sm dark:bg-[#0c1730] dark:text-[#8bbdff]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-[#111b3f] dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#64708d] dark:text-white/58">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#e6edf7] bg-[#f8faff] px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-bold leading-5 text-[#64708d] dark:text-white/55">
                {isHelp ? t('analysis.helpFooter') : t('analysis.changelogFooter')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const RecentJobItem = ({
  job,
  active,
  onClick,
  onArchiveReport,
  onDeleteReport,
}: {
  job: AnalysisJob;
  active: boolean;
  onClick: () => void;
  onArchiveReport: () => void;
  onDeleteReport: () => void;
}) => {
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasReport = Boolean(job.result?.report_id);
  const summary = getJobSummary(job);
  const score = summary.migration_score;
  const blockers = summary.blocker_count;
  const isCompleted = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const handleArchiveAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onArchiveReport();
  };

  const handleDeleteAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDeleteReport();
  };

  const closeMenuOnLeave = () => {
    if (isMenuOpen) setIsMenuOpen(false);
  };

  return (
    <div
      onClick={onClick}
      onMouseLeave={closeMenuOnLeave}
      role="button"
      tabIndex={0}
      className={`relative w-full cursor-pointer rounded-2xl border p-2.5 text-left transition ${
        active
          ? 'border-[#bdd5fa] bg-[#eaf3ff] dark:border-[#2f80ed]/35 dark:bg-[#10264d]'
          : 'border-[#dbe4f2] bg-[#f8faff] hover:border-[#bdd5fa] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white text-[#2f80ed] dark:bg-white/8 dark:text-[#8bbdff]' : 'bg-white text-[#64708d] dark:bg-[#0c1730] dark:text-white/60'}`}>
            <FileText size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black leading-4 text-[#111b3f] dark:text-white">{getJobTitle(job)}</p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <p className="truncate text-xs text-[#8a96b3] dark:text-white/45">{formatJobDate(job.updated_at ?? job.created_at)}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${getJobStatusBadgeTone(job.status)}`}>
                {job.status ? getTranslatedJobStatus(t, job.status) : t('analysis.job')}
              </span>
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={toggleMenu}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#8a96b3] transition hover:bg-[#dbe4f2] dark:text-white/45 dark:hover:bg-white/10"
          >
            <MoreVertical size={14} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-[#dbe4f2] bg-white shadow-lg dark:border-white/10 dark:bg-[#0c1730]">
              {hasReport ? (
                <>
                  <button
                    onClick={handleArchiveAction}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold text-[#64708d] transition hover:bg-[#f8faff] dark:text-white/70 dark:hover:bg-white/5"
                  >
                    <Archive size={13} />
                    {t('analysis.archive')}
                  </button>
                  <button
                    onClick={handleDeleteAction}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold text-[#e54848] transition hover:bg-[#fff0f0] dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={13} />
                    {t('analysis.delete')}
                  </button>
                </>
              ) : (
                <span className="block px-3 py-2.5 text-xs font-bold text-[#8a96b3] dark:text-white/35">
                  {t('analysis.reportUnavailable')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 border-t border-[#dbe4f2] pt-1.5 dark:border-white/10">
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="completed-metrics"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mx-auto grid h-4 w-full max-w-[220px] grid-cols-2 items-center gap-4"
            >
              <div className="inline-flex min-w-0 items-center gap-1.5 leading-none">
                <span className="shrink-0 text-[10px] font-black uppercase leading-none tracking-wide text-[#8a96b3] dark:text-white/35">{t('analysis.shortScore')}</span>
                <motion.span
                  key={`score-${score}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="truncate text-[12px] font-black leading-none tabular-nums text-[#2f80ed] dark:text-[#8bbdff]"
                >
                  {typeof score === 'number' ? `${score}/100` : '-'}
                </motion.span>
              </div>
              <div className="inline-flex min-w-0 items-center justify-end gap-1.5 leading-none">
                <span className="shrink-0 text-[10px] font-black uppercase leading-none tracking-wide text-[#8a96b3] dark:text-white/35">{t('analysis.shortBlockers')}</span>
                <motion.span
                  key={`blockers-${blockers}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[12px] font-black leading-none tabular-nums text-[#e54848] dark:text-red-300"
                >
                  {typeof blockers === 'number' ? blockers : '-'}
                </motion.span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={isFailed ? 'failed-state' : 'running-state'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`flex h-4 items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wide ${
                isFailed ? 'text-[#e54848] dark:text-red-300' : 'text-[#2f80ed] dark:text-[#8bbdff]'
              }`}
            >
              {isFailed ? <AlertCircle size={11} /> : <Loader2 size={11} className="animate-spin" />}
              <span>{isFailed ? t('analysis.recentFailed') : t('analysis.recentRunning')}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

const WorkspaceProgressStep = ({
  label,
  value,
  active,
  done,
  failed = false,
  isLast = false,
}: {
  label: string;
  value: string;
  active: boolean;
  done: boolean;
  failed?: boolean;
  isLast?: boolean;
}) => (
  <div className="relative flex gap-3 pb-3 last:pb-0">
    <div className="relative flex w-5 justify-center">
      {!isLast && <span className={`absolute top-5 h-[calc(100%-0.25rem)] w-px rounded-full ${done ? 'bg-[#23d18b]/70' : failed ? 'bg-[#e54848]/45' : 'bg-[#dbe4f2] dark:bg-white/10'}`} />}
      <span className={`relative z-10 mt-0.5 h-4 w-4 rounded-full border-2 ${
        failed
          ? 'border-[#e54848] bg-[#e54848] shadow-[0_0_0_4px_rgba(229,72,72,0.10)]'
          : active
            ? 'border-[#23d18b] bg-[#23d18b] shadow-[0_0_0_4px_rgba(35,209,139,0.12)]'
            : 'border-[#c6d0e3] bg-white dark:border-white/18 dark:bg-[#0c1730]'
      }`} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold text-[#64708d] dark:text-white/58">{label}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${
          failed
            ? 'bg-[#fff0f0] text-[#e54848] dark:bg-red-500/10 dark:text-red-300'
            : active
              ? 'bg-[#e9fbf4] text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]'
              : 'bg-[#eef2f8] text-[#8a96b3] dark:bg-white/6 dark:text-white/45'
        }`}>
          {value}
        </span>
      </div>
    </div>
  </div>
);

const PipelinePanel = ({ activeStage, status }: { activeStage: number; status: JobStatus }) => {
  const { t } = useI18n();

  return (
    <aside className="flex h-full flex-col bg-[#121f46] p-6 text-white sm:p-7">
      <div>
        <h2 className="text-base font-black">{t('analysis.pipelineTitle')}</h2>
        <p className="mt-1 text-sm text-white/48">{t('analysis.pipelineText')}</p>
      </div>

      <div className="mt-4 rounded-2xl bg-white/[0.075] p-4 shadow-sm shadow-black/10 ring-1 ring-white/10">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-3.5 w-3.5 rounded-full bg-[#34d399] shadow-[0_0_0_5px_rgba(52,211,153,0.12)]" />
          <div>
            <p className="text-sm font-black">{status ? t('analysis.pipelineActive') : t('analysis.pipelineReady')}</p>
            <p className="text-xs text-white/58">{status ? t('analysis.processingUpload') : t('analysis.waitingUpload')}</p>
          </div>
        </div>
      </div>

      <div className="mt-7 space-y-0">
        <PipelineStep number="01" eyebrow={t('analysis.dataReady')} title={t('analysis.dataPrep')} text={t('analysis.dataPrepText')} active={activeStage === 1} done={activeStage > 1} connectorState={activeStage > 1 ? 'done' : 'next'} />
        <PipelineStep number="02" eyebrow={t('analysis.currentStage')} title={t('analysis.compatibility')} text={t('analysis.compatibilityText')} active={activeStage === 2} done={activeStage > 2} connectorState={activeStage > 2 ? 'done' : activeStage === 2 ? 'active' : 'idle'} />
        <PipelineStep number="03" eyebrow={t('analysis.finalOutput')} title={t('analysis.aiReport')} text={t('analysis.aiReportText')} active={activeStage === 3} done={false} />
      </div>

      <div className="mt-auto pt-8">
        <div className="rounded-2xl border border-[#f59e0b]/24 bg-[#f59e0b]/7 p-4 text-xs leading-5 text-[#ffc56b] shadow-sm shadow-black/10">
          <div className="flex gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{t('analysis.recommendationReview')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const PipelineStep = ({
  number,
  eyebrow,
  title,
  text,
  active,
  done,
  connectorState,
}: {
  number: string;
  eyebrow: string;
  title: string;
  text: string;
  active: boolean;
  done: boolean;
  connectorState?: 'done' | 'active' | 'next' | 'idle';
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.26, ease: 'easeOut' }}
    className="relative flex gap-4 pb-6 last:pb-0"
  >
    <div className="relative flex w-11 shrink-0 justify-center">
      {connectorState && (
        <motion.span
          initial={{ scaleY: 0.65, opacity: 0.55 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ transformOrigin: 'top' }}
          className={`absolute left-1/2 top-11 h-[calc(100%-2.75rem)] w-[2px] -translate-x-1/2 rounded-full ${
            connectorState === 'done'
              ? 'bg-[#31d4a2]/85'
              : connectorState === 'active'
                ? 'bg-gradient-to-b from-[#31d4a2]/85 to-white/14'
                : connectorState === 'next'
                  ? 'bg-gradient-to-b from-[#5f9df7]/85 to-white/14'
                  : 'bg-white/12'
          }`}
        />
      )}
      <motion.div
        animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={active ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-[11px] font-black shadow-lg transition ${
        active
          ? 'bg-[#2f80ed] text-white shadow-[#2f80ed]/24 ring-4 ring-[#2f80ed]/18'
          : done
            ? 'bg-[#31d4a2]/90 text-[#071126] shadow-[#31d4a2]/16 ring-4 ring-[#31d4a2]/12'
            : 'bg-white/10 text-white/68 shadow-black/10 ring-1 ring-white/10'
      }`}
      >
        {done ? <CheckCircle2 size={17} /> : number}
      </motion.div>
    </div>
    <motion.div
      animate={active ? { x: [0, 2, 0] } : { x: 0 }}
      transition={active ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      className={`flex-1 rounded-2xl p-4 ring-1 transition ${
      active
        ? 'bg-[#1d3f7b]/90 shadow-lg shadow-[#071126]/16 ring-[#5f9df7]/38'
        : done
          ? 'bg-[#18345f]/80 ring-[#31d4a2]/18'
          : 'bg-white/[0.065] ring-white/8'
    }`}
    >
      <p className={`text-[10px] font-black uppercase ${active || done ? 'text-[#34d399]' : 'text-white/35'}`}>{eyebrow}</p>
      <h3 className="mt-1 text-sm font-black">{title}</h3>
      <p className="text-xs text-white/55">{text}</p>
    </motion.div>
  </motion.div>
);

const StatusBadge = ({ status }: { status?: string }) => {
  const { t } = useI18n();
  const isPending = status === 'QUEUED' || status === 'RUNNING' || !status;
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase ${status === 'COMPLETED' ? 'bg-[#dcfce7] text-[#15803d]' : status === 'FAILED' ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#dbeafe] text-[#1d4ed8]'}`}>
      {isPending && <Loader2 size={14} className="animate-spin" />}
      {getTranslatedJobStatus(t, status)}
    </div>
  );
};

const StageChip = ({ label, active }: { label: string; active: boolean }) => (
  <div className={`rounded-xl px-3 py-3 text-xs font-black ${active ? 'bg-white text-[#2f80ed] ring-1 ring-[#bdd5fa] dark:bg-[#10264d] dark:text-[#8bbdff] dark:ring-[#2f80ed]/35' : 'bg-[#edf2fb] text-[#8a96b3] dark:bg-white/5 dark:text-white/40'}`}>
    {label}
  </div>
);

const RunningCheck = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-[#dbe4f2] bg-white px-3 py-2 text-xs font-black text-[#2f80ed] dark:border-white/10 dark:bg-[#0c1730]/70 dark:text-[#8bbdff]">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eaf3ff] dark:bg-[#2f80ed]/12">
      {icon}
    </span>
    <span className="min-w-0 truncate">{label}</span>
  </div>
);

const StatCard = ({ label, value, tone }: { label: string; value: string | number; tone: 'blue' | 'red' | 'green' | 'slate' }) => {
  const colors = {
    blue: 'bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/16 dark:text-[#8bbdff]',
    red: 'bg-[#fff0f0] text-[#e54848] dark:bg-[#e54848]/14 dark:text-red-300',
    green: 'bg-[#e9fbf4] text-[#159866] dark:bg-[#23d18b]/14 dark:text-[#67e8b9]',
    slate: 'bg-[#eef2f8] text-[#64708d] dark:bg-white/8 dark:text-white/70',
  };

  return (
    <div className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-[#dbe4f2] bg-white p-4 transition-colors duration-300 dark:border-white/10 dark:bg-white/5">
      <p className="flex min-h-[28px] items-start text-[10px] font-black uppercase leading-4 text-[#8a96b3] dark:text-white/45">{label}</p>
      <p className={`inline-flex min-h-10 items-center self-start rounded-lg px-3 py-1 text-xl font-black ${colors[tone]}`}>{value}</p>
    </div>
  );
};

const ResourceCards = () => {
  const { t } = useI18n();

  return (
    <div className="mt-5 grid gap-4 sm:mt-7 md:grid-cols-3">
      <AuditInfoCard
        icon={<Archive size={17} />}
        eyebrow={t('analysis.packageEyebrow')}
        title={t('analysis.packageTitle')}
        text={t('analysis.packageText')}
        steps={[
          { icon: <Archive size={14} />, label: t('analysis.packageChipFormats') },
          { icon: <Layers3 size={14} />, label: t('analysis.packageChipSize') },
          { icon: <CheckCircle2 size={14} />, label: t('analysis.packageChipSecure') },
        ]}
        tone="blue"
      />
      <AuditInfoCard
        icon={<Layers3 size={17} />}
        eyebrow={t('analysis.checksEyebrow')}
        title={t('analysis.checksTitle')}
        text={t('analysis.checksText')}
        steps={[
          { icon: <Layers3 size={14} />, label: t('analysis.checksChipApps') },
          { icon: <Gauge size={14} />, label: t('analysis.checksChipScripts') },
          { icon: <CheckCircle2 size={14} />, label: t('analysis.checksChipWorkflows') },
        ]}
        tone="green"
      />
      <AuditInfoCard
        icon={<FileText size={17} />}
        eyebrow={t('analysis.outputEyebrow')}
        title={t('analysis.outputTitle')}
        text={t('analysis.outputText')}
        steps={[
          { icon: <Gauge size={14} />, label: t('analysis.outputChipScore') },
          { icon: <AlertCircle size={14} />, label: t('analysis.outputChipPriority') },
          { icon: <FileJson size={14} />, label: t('analysis.outputChipExports') },
        ]}
        tone="orange"
      />
    </div>
  );
};

const AuditInfoCard = ({
  icon,
  eyebrow,
  title,
  text,
  steps,
  tone,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  text: string;
  steps: Array<{ icon: React.ReactNode; label: string }>;
  tone: 'blue' | 'green' | 'orange';
}) => {
  const tones = {
    blue: {
      border: 'border-t-[#2f80ed]',
      icon: 'bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]',
      flowBg: 'bg-[#f6faff] dark:bg-[#2f80ed]/6',
      node: 'bg-[#eaf3ff] text-[#2f80ed] ring-[#bdd5fa] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff] dark:ring-[#2f80ed]/25',
      line: 'bg-[#bdd5fa] dark:bg-[#2f80ed]/25',
      pulse: 'bg-[#2f80ed]',
    },
    green: {
      border: 'border-t-[#23d18b]',
      icon: 'bg-[#e9fbf4] text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]',
      flowBg: 'bg-[#f3fcf8] dark:bg-[#23d18b]/6',
      node: 'bg-[#e9fbf4] text-[#159866] ring-[#9be7c4] dark:bg-[#23d18b]/12 dark:text-[#67e8b9] dark:ring-[#23d18b]/25',
      line: 'bg-[#9be7c4] dark:bg-[#23d18b]/25',
      pulse: 'bg-[#23d18b]',
    },
    orange: {
      border: 'border-t-[#f59e0b]',
      icon: 'bg-[#fff7e7] text-[#b96500] dark:bg-[#f59e0b]/12 dark:text-[#ffbd55]',
      flowBg: 'bg-[#fffaf0] dark:bg-[#f59e0b]/6',
      node: 'bg-[#fff7e7] text-[#b96500] ring-[#ffd36d] dark:bg-[#f59e0b]/12 dark:text-[#ffbd55] dark:ring-[#f59e0b]/25',
      line: 'bg-[#ffd36d] dark:bg-[#f59e0b]/25',
      pulse: 'bg-[#f59e0b]',
    },
  };
  const selectedTone = tones[tone];

  return (
    <article className={`rounded-[18px] border border-[#dbe4f2] border-t-4 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-white/10 dark:bg-[#101d3a] ${selectedTone.border}`}>
      <div className="flex gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedTone.icon}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-[#8a96b3] dark:text-white/45">{eyebrow}</p>
          <h3 className="text-sm font-black leading-4">{title}</h3>
          <p className="mt-1 text-xs text-[#64708d] dark:text-white/60">{text}</p>
        </div>
      </div>
      <div className={`mt-4 rounded-2xl border border-[#dbe4f2]/80 p-3 dark:border-white/10 ${selectedTone.flowBg}`}>
        <div className="relative grid grid-cols-3 gap-2">
          <span className={`absolute left-[15%] right-[15%] top-4 h-px ${selectedTone.line}`} />
          <motion.span
            className={`absolute top-[13px] h-1.5 w-1.5 rounded-full shadow-sm ${selectedTone.pulse}`}
            animate={{ left: ['14%', '49%', '84%'], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {steps.map((step, index) => (
            <div key={step.label} className="relative z-10 flex min-w-0 flex-col items-center text-center">
              <motion.span
                className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${selectedTone.node}`}
                animate={{ scale: index === 1 ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                {step.icon}
              </motion.span>
              <span className="mt-2 flex min-h-6 max-w-[88px] items-start justify-center text-center text-[9px] font-black uppercase leading-3 tracking-wide text-[#64708d] [overflow-wrap:anywhere] dark:text-white/55">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};

export default AnalysisPage;
