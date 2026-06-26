import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
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
  Home,
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
} from 'lucide-react';

import { FileUploader } from '../../shared/components/FileUploader';
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher';
import { MainSidebar } from '../../shared/components/MainSidebar';
import { useI18n } from '../../i18n';
import { useJobStatus } from '../../hooks/useJobStatus';
import { analysisService, type AnalysisJob } from '../../services/analysisService';
import { api } from '../../core/api';
import logoSpectrumDark from '../../assets/img/logo-spectrum-groupe-darkmode.png';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';

type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string | undefined;

export const AnalysisPage: React.FC = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [analysisName, setAnalysisName] = useState('');
  const [analysisDraftKey, setAnalysisDraftKey] = useState(0);
  const [recentJobs, setRecentJobs] = useState<AnalysisJob[]>([]);
  const [recentJobsHasMore, setRecentJobsHasMore] = useState(false);
  const [recentJobsLimit, setRecentJobsLimit] = useState(6);
  const [recentJobsLoading, setRecentJobsLoading] = useState(false);
  const [isLight, setIsLight] = useState(() => {
    const savedTheme = localStorage.getItem('jira-migration-theme');
    if (savedTheme) return savedTheme === 'light';
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const jobStatus = useJobStatus(jobId);
  const analysisNameRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useI18n();

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
    let isMounted = true;

    const fetchRecentJobs = async () => {
      setRecentJobsLoading(true);
      try {
        const [jobs, reportsResponse] = await Promise.all([
          analysisService.listJobs(recentJobsLimit),
          api.get<{ reports?: Array<{ report_id?: string }> }>('/reports'),
        ]);
        const activeReportIds = new Set(
          (reportsResponse.data.reports ?? [])
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
    setAnalysisDraftKey((key) => key + 1);
    window.setTimeout(() => analysisNameRef.current?.focus(), 0);
  };

  const handleUploadSuccess = (id: string) => {
    setJobId(id);
  };

  const handleRecentJobClick = (job: AnalysisJob) => {
    const reportIdFromJob = job.result?.report_id;
    if (reportIdFromJob && job.status === 'COMPLETED') {
      navigate(`/reports/${reportIdFromJob}`);
      return;
    }

    setJobId(job.job_id);
    setAnalysisName(getJobTitle(job));
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
      alert('Unable to delete this report.');
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
      alert('Unable to archive this report.');
    }
  };

  const handleLoadMoreRecentJobs = () => {
    setRecentJobsLimit((limit) => limit + 6);
  };

  const downloadFile = async (type: 'json' | 'pdf') => {
    if (!reportId) return;
    try {
      const response = await api.get(`/reports/${reportId}/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(`Erreur telechargement ${type}:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      <div className="flex min-h-screen">
        <MainSidebar activePage="analysis" />

        <div className="flex min-h-screen flex-1 flex-col md:pl-[72px]">
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
                    className={`${isLight ? 'h-9' : 'h-12'} w-auto object-contain`}
                  />
                </button>
                <div className="hidden h-8 w-px bg-[#d4deee] sm:block" />
                <div className="hidden items-center gap-2 text-sm sm:flex">
                  <span className="text-[#8a96b3] dark:text-white/55">Platform</span>
                  <strong>AI Migration Solutions</strong>
                </div>
                <div className="hidden items-center gap-2 rounded-full border border-[#bdd5fa] bg-[#f5f9ff] px-4 py-1.5 text-xs font-bold text-[#2f80ed] lg:flex dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]">
                  <span className="h-2 w-2 rounded-full bg-[#2f80ed]" />
                  Ready to analyse
                </div>
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
                  {t('common.viewReport')}
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
              jobId={jobId}
              progress={progress}
              recentJobs={recentJobs}
              recentJobsHasMore={recentJobsHasMore}
              recentJobsLoading={recentJobsLoading}
              startNewAnalysis={startNewAnalysis}
              onArchiveRecentReport={handleArchiveRecentReport}
              onDeleteRecentReport={handleDeleteRecentReport}
              onLoadMoreRecentJobs={handleLoadMoreRecentJobs}
              onRecentJobClick={handleRecentJobClick}
              setIsCollapsed={setIsSidebarCollapsed}
              status={jobStatus?.status}
            />

            <section className="px-4 py-5 sm:px-6 lg:px-8">
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
                        <div className="p-6 sm:p-9">
                          <div className="mb-4 flex items-center gap-2">
                            <span className="rounded-full bg-[#2f80ed] px-5 py-2 text-[10px] font-black uppercase text-white">{t('analysis.importStep')}</span>
                            <span className="h-px w-32 bg-[#bdd5fa]" />
                          </div>

                          <h1 className="text-[22px] font-black leading-tight sm:text-2xl">{t('analysis.importTitle')}</h1>
                          <p className="mt-1 max-w-2xl text-sm leading-5 text-[#64708d] dark:text-white/60">
                            {t('analysis.importText')}
                          </p>

                          <label className="mt-4 block text-xs font-black">{t('analysis.name')}</label>
                          <input
                            ref={analysisNameRef}
                            value={analysisName}
                            onChange={(event) => setAnalysisName(event.target.value)}
                            placeholder={t('analysis.namePlaceholder')}
                            className="mt-2 h-11 w-full rounded-xl border border-[#d6e0ee] bg-[#f8faff] px-4 text-sm font-semibold outline-none transition placeholder:text-[#c4ccdc] focus:border-[#2f80ed] focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:bg-[#0c1730] dark:focus:ring-blue-500/20"
                          />

                          <div className="mt-4">
                            <FileUploader key={analysisDraftKey} onUploadSuccess={handleUploadSuccess} />
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
                        <div className="p-6 sm:p-9">
                          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="mb-4 flex items-center gap-2">
                                <span className="rounded-full bg-[#2f80ed] px-5 py-2 text-[10px] font-black uppercase text-white">{t('analysis.stepOfTotal', { step: activeStage, total: 3 })}</span>
                                <span className="h-px w-32 bg-[#bdd5fa]" />
                              </div>
                              <h1 className="text-2xl font-black leading-tight">{t('analysis.pipelineProgress')}</h1>
                              <p className="mt-1 max-w-xl text-sm text-[#64708d] dark:text-white/60">
                                {t('analysis.pipelineProgressText', { name: analysisName || t('analysis.migrationPackage') })}
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
                              Clear
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
                                  View report
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
  const filename = job.payload?.filename;
  if (filename) return filename.replace(/\.[^/.]+$/, '');
  return `Analysis ${job.job_id.substring(0, 8)}`;
};

const getJobProgress = (status?: string) => {
  if (status === 'QUEUED' || status === 'STARTED') return 25;
  if (status === 'RUNNING') return 66;
  if (status === 'COMPLETED' || status === 'FAILED') return 100;
  return 10;
};

const getJobStatusTone = (status?: string) => {
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

const SecondarySidebar = ({
  analysisName,
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
  startNewAnalysis,
  setIsCollapsed,
  status,
}: {
  analysisName: string;
  isCollapsed: boolean;
  jobId: string | null;
  onArchiveRecentReport: (job: AnalysisJob) => void;
  onDeleteRecentReport: (job: AnalysisJob) => void;
  onLoadMoreRecentJobs: () => void;
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

  return (
    <section className={`hidden border-r border-[#dce4f4] bg-white py-5 transition-all duration-300 dark:border-white/10 dark:bg-[#0c1730] lg:flex lg:min-h-[calc(100vh-62px)] lg:flex-col ${isCollapsed ? 'items-center px-3' : 'px-4'}`}>
      {isCollapsed ? (
        <>
          <button
            onClick={() => setIsCollapsed(false)}
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dbe4f2] text-[#64708d] transition hover:border-[#bdd5fa] hover:bg-[#f8faff] hover:text-[#2f80ed] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/6 dark:hover:text-white"
            aria-label={t('common.openAnalysis')}
            title={t('common.openAnalysis')}
          >
            <PanelLeftOpen size={19} />
          </button>
          <button
            onClick={startNewAnalysis}
            className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f80ed] text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-[#256fdb]"
            aria-label={t('analysis.newAnalysis')}
            title={t('analysis.newAnalysis')}
          >
            <Plus size={20} />
          </button>

          <div className="flex flex-col items-center gap-3">
            <CompactSidebarButton icon={<Gauge size={19} />} active={recentJobs.length > 0} label={t('analysis.recentCount', { count: recentJobs.length })} />
            <CompactSidebarButton icon={<FileText size={18} />} active={Boolean(jobId)} label={t('analysis.audit')} />
            <CompactSidebarButton icon={<AlertCircle size={18} />} tone="warning" label={t('analysis.ai')} />
          </div>

          <div className="mt-auto flex flex-col items-center gap-3 pb-2">
            <CompactSidebarButton icon={<HelpCircle size={18} />} label={t('analysis.help')} />
            <CompactSidebarButton icon={<BookOpen size={18} />} label={t('analysis.log')} />
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#dbe4f2] text-[#64708d] transition hover:border-[#bdd5fa] hover:bg-[#f8faff] hover:text-[#2f80ed] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/6 dark:hover:text-white"
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
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
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
                  <span>{status || t('analysis.initializing')}</span>
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

            <div className="mt-4 rounded-2xl border border-[#dbe4f2] bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('analysis.workspaceStatus')}</p>
              <div className="mt-3 space-y-3">
                <SidebarMetric label={t('analysis.dataPackage')} value={jobId ? t('analysis.uploaded') : t('analysis.waiting')} active={Boolean(jobId)} />
                <SidebarMetric label={t('analysis.cloudReadiness')} value={status === 'COMPLETED' ? t('analysis.pipelineActive') : t('analysis.pending')} active={status === 'COMPLETED'} />
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-4 pb-2">
            <div className="rounded-lg border border-[#ffd36d] bg-[#fff9e6] px-4 py-3 text-sm text-[#9b4f00] dark:border-[#f59e0b]/35 dark:bg-[#f59e0b]/10 dark:text-[#ffbe4d]">
              <div className="mb-1 flex items-center gap-2 font-black">
                <AlertCircle size={16} />
                {t('analysis.aiWarningTitle')}
              </div>
              <p>{t('analysis.aiWarningText')}</p>
            </div>
            <div className="space-y-3 px-1 text-base text-[#8291b3] dark:text-white/55">
              <button className="flex items-center gap-2 transition hover:text-[#2f80ed]">
                <HelpCircle size={18} />
                {t('analysis.help')}
              </button>
              <button className="flex items-center gap-2 transition hover:text-[#2f80ed]">
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

const CompactSidebarButton = ({ icon, label, active, tone }: { icon: React.ReactNode; label: string; active?: boolean; tone?: 'warning' }) => (
  <button
    className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
      tone === 'warning'
        ? 'border-[#ffd36d] bg-[#fff9e6] text-[#9b4f00] dark:border-[#f59e0b]/35 dark:bg-[#f59e0b]/10 dark:text-[#ffbe4d]'
        : active
          ? 'border-[#bdd5fa] bg-[#eaf3ff] text-[#2f80ed] dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]'
          : 'border-[#dbe4f2] bg-white text-[#8291b3] hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white'
    }`}
    aria-label={label}
    title={label}
  >
    {icon}
  </button>
);

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
  const progress = getJobProgress(job.status);
  const isCompleted = job.status === 'COMPLETED' && Boolean(job.result?.report_id);
  const hasReport = Boolean(job.result?.report_id);

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
      className={`relative w-full cursor-pointer rounded-2xl border p-3 text-left transition ${
        active
          ? 'border-[#bdd5fa] bg-[#eaf3ff] dark:border-[#2f80ed]/35 dark:bg-[#10264d]'
          : 'border-[#dbe4f2] bg-[#f8faff] hover:border-[#bdd5fa] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white text-[#2f80ed] dark:bg-white/8 dark:text-[#8bbdff]' : 'bg-white text-[#64708d] dark:bg-[#0c1730] dark:text-white/60'}`}>
            <FileText size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#111b3f] dark:text-white">{getJobTitle(job)}</p>
            <p className="mt-0.5 text-xs text-[#8a96b3] dark:text-white/45">{formatJobDate(job.updated_at ?? job.created_at)}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${getJobStatusTone(job.status)}`}>
            {isCompleted ? 'Report' : job.status || 'Job'}
          </span>

          <div className="relative">
            <button
              onClick={toggleMenu}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#8a96b3] transition hover:bg-[#dbe4f2] dark:text-white/45 dark:hover:bg-white/10"
            >
              <MoreVertical size={14} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-xl border border-[#dbe4f2] bg-white shadow-lg dark:border-white/10 dark:bg-[#0c1730]">
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
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dfe8f6] dark:bg-white/10">
        <span className={`block h-full rounded-full ${job.status === 'FAILED' ? 'bg-[#e54848]' : job.status === 'COMPLETED' ? 'bg-[#23d18b]' : 'bg-[#2f80ed]'}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

const SidebarMetric = ({ label, value, active }: { label: string; value: string; active: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-[#23d18b]' : 'bg-[#c6d0e3] dark:bg-white/20'}`} />
      <span className="truncate text-xs font-semibold text-[#64708d] dark:text-white/58">{label}</span>
    </div>
    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${active ? 'bg-[#e9fbf4] text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]' : 'bg-[#eef2f8] text-[#8a96b3] dark:bg-white/6 dark:text-white/45'}`}>
      {value}
    </span>
  </div>
);

const PipelinePanel = ({ activeStage, status }: { activeStage: number; status: JobStatus }) => {
  const { t } = useI18n();

  return (
    <aside className="bg-[#162762] p-6 text-white sm:p-7">
      <h2 className="text-base font-black">{t('analysis.pipelineTitle')}</h2>
      <p className="mt-1 text-sm text-white/48">{t('analysis.pipelineText')}</p>

    <div className="mt-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/8">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3.5 w-3.5 rounded-full bg-[#34d399]" />
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

    <div className="mt-5 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4 text-xs leading-5 text-[#ffb43b]">
      <div className="flex gap-2">
        <AlertCircle size={15} className="mt-0.5 shrink-0" />
        <p>{t('analysis.recommendationReview')}</p>
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
  <div className="relative flex gap-4 pb-6 last:pb-0">
    <div className="relative flex w-11 shrink-0 justify-center">
      {connectorState && (
        <span
          className={`absolute left-1/2 top-11 h-[calc(100%-2.75rem)] w-[2px] -translate-x-1/2 rounded-full ${
            connectorState === 'done'
              ? 'bg-[#31d4a2]'
              : connectorState === 'active'
                ? 'bg-gradient-to-b from-[#31d4a2] to-white/18'
                : connectorState === 'next'
                  ? 'bg-gradient-to-b from-[#2f80ed] to-white/18'
                  : 'bg-white/14'
          }`}
        />
      )}
      <div className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-[11px] font-black shadow-lg transition ${
        active
          ? 'bg-[#2f80ed] text-white shadow-[#2f80ed]/35 ring-4 ring-[#2f80ed]/20'
          : done
            ? 'bg-[#31d4a2] text-[#0b2144] shadow-[#31d4a2]/20 ring-4 ring-[#31d4a2]/15'
            : 'bg-white/12 text-white/72 shadow-black/10 ring-1 ring-white/10'
      }`}>
        {done ? <CheckCircle2 size={17} /> : number}
      </div>
    </div>
    <div className={`flex-1 rounded-2xl p-4 ring-1 ${active ? 'bg-[#1d438a] ring-[#2f80ed]/55' : 'bg-white/8 ring-white/8'}`}>
      <p className={`text-[10px] font-black uppercase ${active || done ? 'text-[#34d399]' : 'text-white/35'}`}>{eyebrow}</p>
      <h3 className="mt-1 text-sm font-black">{title}</h3>
      <p className="text-xs text-white/55">{text}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status?: string }) => {
  const isPending = status === 'QUEUED' || status === 'RUNNING' || !status;
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase ${status === 'COMPLETED' ? 'bg-[#dcfce7] text-[#15803d]' : status === 'FAILED' ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#dbeafe] text-[#1d4ed8]'}`}>
      {isPending && <Loader2 size={14} className="animate-spin" />}
      {status || 'Initializing'}
    </div>
  );
};

const StageChip = ({ label, active }: { label: string; active: boolean }) => (
  <div className={`rounded-xl px-3 py-3 text-xs font-black ${active ? 'bg-white text-[#2f80ed] ring-1 ring-[#bdd5fa] dark:bg-[#10264d] dark:text-[#8bbdff] dark:ring-[#2f80ed]/35' : 'bg-[#edf2fb] text-[#8a96b3] dark:bg-white/5 dark:text-white/40'}`}>
    {label}
  </div>
);

const StatCard = ({ label, value, tone }: { label: string; value: string | number; tone: 'blue' | 'red' | 'green' | 'slate' }) => {
  const colors = {
    blue: 'bg-[#eaf3ff] text-[#2f80ed]',
    red: 'bg-[#fff0f0] text-[#e54848]',
    green: 'bg-[#e9fbf4] text-[#159866]',
    slate: 'bg-[#eef2f8] text-[#64708d]',
  };

  return (
    <div className="rounded-2xl border border-[#dbe4f2] bg-white p-4 transition-colors duration-300 dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] font-black uppercase text-[#8a96b3] dark:text-white/45">{label}</p>
      <p className={`mt-2 inline-flex rounded-lg px-3 py-1 text-xl font-black ${colors[tone]}`}>{value}</p>
    </div>
  );
};

const ResourceCards = () => {
  const { t } = useI18n();

  return (
    <div className="mt-16 grid gap-4 md:grid-cols-3">
      <ResourceCard icon={<Home size={17} />} eyebrow={t('analysis.docsEyebrow')} title={t('analysis.docsTitle')} text={t('analysis.docsText')} action={t('analysis.docsAction')} tone="blue" />
      <ResourceCard icon={<Layers3 size={17} />} eyebrow={t('analysis.academyEyebrow')} title={t('analysis.academyTitle')} text={t('analysis.academyText')} action={t('analysis.academyAction')} tone="purple" />
      <ResourceCard icon={<Activity size={17} />} eyebrow={t('analysis.benchmarkEyebrow')} title={t('analysis.benchmarkTitle')} text={t('analysis.benchmarkText')} action={t('analysis.benchmarkAction')} tone="pink" />
    </div>
  );
};

const ResourceCard = ({ icon, eyebrow, title, text, action, tone }: { icon: React.ReactNode; eyebrow: string; title: string; text: string; action: string; tone: 'blue' | 'purple' | 'pink' }) => {
  const tones = {
    blue: 'border-t-[#2f80ed] text-[#2f80ed] bg-[#eaf3ff]',
    purple: 'border-t-[#7c3aed] text-[#7c3aed] bg-[#f3eefe]',
    pink: 'border-t-[#ec1681] text-[#ec1681] bg-[#fff0f7]',
  };

  return (
    <article className={`rounded-[18px] border-t-4 bg-white p-5 shadow-sm transition-colors duration-300 dark:bg-[#101d3a] ${tones[tone]}`}>
      <div className="flex gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-[#8a96b3] dark:text-white/45">{eyebrow}</p>
          <h3 className="text-sm font-black leading-4">{title}</h3>
          <p className="mt-1 text-xs text-[#64708d] dark:text-white/60">{text}</p>
          <button className="mt-3 text-xs font-black">
            {action} <ChevronRight className="inline" size={13} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default AnalysisPage;