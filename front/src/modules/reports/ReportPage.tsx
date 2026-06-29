import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Gauge,
  Layers,
  Loader2,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  XCircle,
  Zap,
} from 'lucide-react';

import { MainSidebar } from '../../shared/components/MainSidebar';
import { LocaleSwitcher } from '../../shared/components/LocaleSwitcher';
import { useI18n } from '../../i18n';
import {
  reportService,
  type ReportComponent,
  type ReportData,
  type ReportRecommendation,
} from '../../services/reportService';

type SecurityTone = 'red' | 'yellow' | 'green';

interface SecurityStatus {
  label: string;
  tone: SecurityTone;
  description: string;
}

interface DetailEntry {
  title: string;
  value: unknown;
}

const THEME_KEY = 'jira-migration-theme';

const getTranslatedComponentField = (
  component: ReportComponent,
  field: 'reasoning_summary' | 'recommended_action',
  report: ReportData | null,
  language?: string,
) => {
  if (language !== 'fr' || !report?.translations?.fr?.sections?.components) {
    return component[field] ?? '';
  }

  const translation = report.translations.fr.sections?.components?.find(
    (translated) => translated.component_id && translated.component_id === component.component_id,
  );

  return (translation?.[field] as string | undefined) ?? component[field] ?? '';
};

const getTranslatedRecommendationField = (
  recommendation: ReportRecommendation,
  field: 'action' | 'reason',
  report: ReportData | null,
  language?: string,
) => {
  if (language !== 'fr' || !report?.translations?.fr?.sections?.recommendations) {
    return recommendation[field] ?? '';
  }

  const translation = report.translations.fr.sections?.recommendations?.find(
    (translated) => translated.component_id && translated.component_id === recommendation.component_id,
  );

  return (translation?.[field] as string | undefined) ?? recommendation[field] ?? '';
};

const getTranslatedText = (
  value: string | undefined,
  translated: string | undefined,
  language?: string,
) => {
  if (language !== 'fr') return value ?? '';
  return translated ?? value ?? '';
};

export const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLight, setIsLight] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) return savedTheme === 'light';
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !isLight);
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  }, [isLight]);

  const originalAiSummaryRef = useRef<string | null>(null);

  const getCachedTranslation = (reportData: ReportData | null) => {
    if (!reportData) return null;
    return reportData.ai_summary_fr ?? (reportData.translations?.fr?.ai_summary as string | undefined) ?? null;
  };

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) return;
      try {
        const data = await reportService.getReport(reportId);
        setReport(data);
        // keep original AI summary so we can restore when switching back to English
        originalAiSummaryRef.current = (data && (data.ai_summary as string)) || '';
      } catch (error) {
        console.error('Erreur chargement rapport:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  // Auto-translate or restore summary when language changes
  useEffect(() => {
    if (!report || !reportId) return;

    const applyTranslation = async () => {
      try {
        if (language === 'fr') {
          const cached = getCachedTranslation(report);
          if (cached) {
            setReport((r) => {
              if (!r) return r;
              if (r.ai_summary === String(cached)) return r;
              return { ...r, ai_summary: String(cached) };
            });
            return;
          }

          const res = await reportService.translateReport(reportId, 'fr');
          const translated = res?.ai_summary_fr || res?.ai_summary || '';
          const translatedSectionData = res?.translations?.fr ?? {};

          if (translated) {
            setReport((r) => {
              if (!r) return r;
              const nextTranslations = {
                ...r.translations,
                fr: {
                  ...((r.translations?.fr as Record<string, unknown>) || {}),
                  ...translatedSectionData,
                  ai_summary: translated,
                },
              };

              if (r.ai_summary === String(translated) && r.ai_summary_fr === String(translated)) {
                return { ...r, translations: nextTranslations };
              }

              return {
                ...r,
                ai_summary: String(translated),
                ai_summary_fr: String(translated),
                translations: nextTranslations,
              };
            });
          }
        } else {
          setReport((r) => {
            if (!r) return r;
            const original = originalAiSummaryRef.current ?? (r.ai_summary as string);
            if (r.ai_summary === original) return r;
            return { ...r, ai_summary: original };
          });
        }
      } catch (err) {
        console.error('Erreur traduction du rapport:', err);
      }
    };

    applyTranslation();
  }, [language, reportId, report]);

  const getTranslatedMigrationRecommendation = () => {
    if (language !== 'fr') return report?.migration_recommendation;
    return report?.translations?.fr?.migration_recommendation ?? report?.migration_recommendation;
  };

  const metrics = useMemo(() => {
    const statistics = report?.statistics;
    return {
      score: statistics?.migration_score ?? report?.migration_score ?? 0,
      blockers: statistics?.blocker_count ?? report?.blocker_count ?? 0,
      components: statistics?.total_components ?? report?.total_components ?? 0,
      compatible: statistics?.compatible_count ?? 0,
      incompatible: statistics?.incompatible_count ?? 0,
      major: statistics?.major_count ?? 0,
      recommendation: getTranslatedMigrationRecommendation() ?? statistics?.migration_recommendation ?? report?.migration_recommendation,
    };
  }, [report, language]);

  const securityStatus = useMemo<SecurityStatus>(() => {
    if (metrics.incompatible > 0 || metrics.blockers > 0) {
      return {
        label: t('reports.critical'),
        tone: 'red',
        description: t('reports.criticalText'),
      };
    }

    if (metrics.major > 0) {
      return {
        label: t('reports.review'),
        tone: 'yellow',
        description: t('reports.reviewText'),
      };
    }

    return {
      label: t('reports.healthy'),
      tone: 'green',
      description: t('reports.healthyText'),
    };
  }, [metrics.blockers, metrics.incompatible, metrics.major, t]);

  const detailEntries = useMemo(
    () => normalizeDetails(language === 'fr' ? report?.translations?.fr?.details ?? report?.details : report?.details),
    [report?.details, report?.translations?.fr?.details, language],
  );
  const componentFindings = useMemo(() => report?.sections?.components ?? [], [report?.sections?.components]);
  const prioritizedRecommendations = useMemo(
    () => report?.sections?.recommendations ?? [],
    [report?.sections?.recommendations],
  );
  const sanitizedAiSummary = useMemo(
    () => sanitizeReportText(getTranslatedText(report?.ai_summary, report?.translations?.fr?.ai_summary, language), report),
    [report, language],
  );
  const translatedAiInsights = useMemo(
    () => getTranslatedText(report?.ai_insights, report?.translations?.fr?.ai_insights, language),
    [report?.ai_insights, report?.translations?.fr?.ai_insights, language],
  );
  const translatedAiError = useMemo(
    () => getTranslatedText(report?.ai_error, report?.translations?.fr?.ai_error, language),
    [report?.ai_error, report?.translations?.fr?.ai_error, language],
  );

  const reportDetails = useMemo(() => {
    const details: Array<{ label: string; value: unknown }> = [];

    if (report?.ai_model) {
      details.push({ label: t('reports.analysisEngine'), value: report.ai_model });
    }

    if (typeof report?.ai_used === 'boolean') {
      details.push({ label: t('reports.aiUsed'), value: report.ai_used ? t('common.yes') : t('common.no') });
    }

    const generatedOn = report?.updated_at ?? report?.created_at;
    if (generatedOn) {
      details.push({ label: t('reports.generatedOn'), value: generatedOn });
    }

    return details;
  }, [report, t]);

  const handleDownload = async (type: 'pdf' | 'json') => {
    if (!reportId) return;
    await reportService.downloadReport(reportId, type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
        <MainSidebar activePage="reports" />
        <div className="flex min-h-screen items-center justify-center md:pl-[72px]">
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin text-[#2f80ed]" size={34} />
            <p className="mt-4 text-sm font-black text-[#64708d] dark:text-white/60">{t('reports.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
        <MainSidebar activePage="reports" />
        <div className="flex min-h-screen items-center justify-center px-6 md:pl-[72px]">
          <div className="max-w-md rounded-2xl border border-[#dbe4f2] bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#101d3a]">
            <XCircle className="mx-auto text-red-500" size={34} />
            <h1 className="mt-4 text-xl font-black">{t('reports.notFound')}</h1>
            <p className="mt-2 text-sm text-[#64708d] dark:text-white/58">{t('reports.notFoundText')}</p>
            <button
              onClick={() => navigate('/analysis')}
              className="mt-6 rounded-xl bg-[#2f80ed] px-5 py-3 text-sm font-black text-white"
            >
              {t('reports.backToAnalysis')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#111b3f] transition-colors duration-300 dark:bg-[#071126] dark:text-white">
      <MainSidebar activePage="reports" />

      <div className="min-h-screen md:pl-[72px]">
        <header className="sticky top-0 z-30 border-b border-[#dce4f4] bg-white/95 backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-[#0c1730]/95">
          <div className="flex h-[62px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0ef] text-[#64708d] transition hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:text-white/65 dark:hover:bg-white/6"
                aria-label={t('common.back')}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('reports.migrationReport')}</p>
                <h1 className="truncate text-base font-black sm:text-lg">{t('common.report')} {shortId(reportId)}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LocaleSwitcher className="hidden sm:flex" />
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
                onClick={() => handleDownload('json')}
                className="flex items-center gap-2 rounded-xl border border-[#d7e0ef] bg-[#f7f9fd] px-3 py-2 text-sm font-bold text-[#64708d] transition hover:border-[#bdd5fa] hover:text-[#2f80ed] dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8"
              >
                <FileJson size={16} />
                {t('common.json')}
              </button>
              <button
                onClick={() => handleDownload('pdf')}
                className="flex items-center gap-2 rounded-xl bg-[#2f80ed] px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#256fdb]"
              >
                <Download size={16} />
                {t('common.pdf')}
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-7xl">
            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="rounded-[22px] bg-white p-6 shadow-sm ring-1 ring-[#dbe4f2] dark:bg-[#101d3a] dark:ring-white/10 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#bdd5fa] bg-[#f5f9ff] px-4 py-2 text-xs font-black text-[#2f80ed] dark:border-[#2f80ed]/35 dark:bg-[#10264d] dark:text-[#8bbdff]">
                      <Sparkles size={14} />
                      {t('reports.aiAssessment')}
                    </div>
                    <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">{t('reports.cloudReadiness')}</h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-[#64708d] dark:text-white/60">
                      {metrics.recommendation || t('reports.noRecommendation')}
                    </p>
                  </div>

                  <ScoreRing score={metrics.score} />
                </div>
              </div>

              <SecurityPanel status={securityStatus} />
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={<AlertTriangle size={20} />} label={t('reports.criticalBlockers')} value={metrics.blockers} tone="red" />
              <MetricCard icon={<Layers size={20} />} label={t('reports.components')} value={metrics.components} tone="blue" />
              <MetricCard icon={<CheckCircle2 size={20} />} label={t('reports.compatible')} value={metrics.compatible} tone="green" />
              <MetricCard icon={<ShieldAlert size={20} />} label={t('reports.incompatible')} value={metrics.incompatible} tone="yellow" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <section className="space-y-6">
                {report.ai_summary && (
                  <ContentPanel title={t('reports.aiSummary')} icon={<Brain size={18} />}>
                    <AISummaryRenderer content={sanitizedAiSummary} />
                  </ContentPanel>
                )}

                {componentFindings.length > 0 && (
                  <ContentPanel title={t('reports.componentFindings')} icon={<Layers size={18} />}>
                    <div className="space-y-3">
                      {componentFindings.map((component, index) => (
                        <ComponentFindingCard
                          key={`${component.component_id ?? componentDisplayName(component, index)}-${index}`}
                          component={component}
                          index={index}
                          report={report}
                        />
                      ))}
                    </div>
                  </ContentPanel>
                )}

                {prioritizedRecommendations.length > 0 && (
                  <ContentPanel title={t('reports.prioritizedRecommendations')} icon={<AlertTriangle size={18} />}>
                    <div className="space-y-3">
                      {prioritizedRecommendations.map((recommendation, index) => (
                        <RecommendationCard
                          key={`${recommendation.component_id ?? recommendation.component_name ?? 'recommendation'}-${index}`}
                          recommendation={recommendation}
                          index={index}
                          report={report}
                        />
                      ))}
                    </div>
                  </ContentPanel>
                )}

                {translatedAiInsights && (
                  <ContentPanel title={t('reports.aiInsights')} icon={<Zap size={18} />}>
                    <p className="text-sm leading-7 text-[#64708d] dark:text-white/68">{translatedAiInsights}</p>
                  </ContentPanel>
                )}

                {detailEntries.length > 0 && (
                  <ContentPanel title={t('reports.details')} icon={<FileText size={18} />}>
                    <div className="space-y-3">
                      {detailEntries.map((detail) => (
                        <ReportDetailRow key={detail.title} detail={detail} report={report} />
                      ))}
                    </div>
                  </ContentPanel>
                )}
              </section>

              <aside className="space-y-6">
                {reportDetails.length > 0 && (
                  <ContentPanel title={t('reports.metadata')} icon={<Gauge size={18} />}>
                    <div className="space-y-3">
                      {reportDetails.map((detail) => (
                        <InfoLine key={String(detail.label)} label={detail.label} value={detail.value} />
                      ))}
                    </div>
                  </ContentPanel>
                )}

                {translatedAiError && (
                  <ContentPanel title={t('reports.aiError')} icon={<AlertTriangle size={18} />}>
                    <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                      {translatedAiError}
                    </p>
                  </ContentPanel>
                )}
              </aside>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const shortId = (value?: string) => (value ? `${value.substring(0, 8)}...` : '-');

const formatValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const locationLabel = (location?: Record<string, unknown>) => {
  if (!location) return '';

  const workflow = formatValue(location.workflow);
  const transition = formatValue(location.transition);
  const filePath = formatValue(location.file_path);

  if (workflow !== '-') return workflow;
  if (transition !== '-') return transition;
  if (filePath !== '-') return humanizeFileName(filePath);

  return '';
};

const humanizeFileName = (value: string) => {
  const filename = value.split(/[\\/]/).pop() ?? value;
  const stem = filename.replace(/\.[^.]+$/, '');
  const withoutPrefix = stem.replace(/^\d+[_\s-]*/, '');
  const spaced = withoutPrefix.replace(/[_-]+/g, ' ').trim();

  if (!spaced) return filename;

  return spaced
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const componentDisplayName = (component: ReportComponent | ReportRecommendation, index = 0) => {
  const name = component.component_name?.trim();
  if (name) return name;

  if ('location' in component) {
    const label = locationLabel(component.location);
    if (label) return label;
  }

  return `Component ${index + 1}`;
};

const sanitizeReportText = (text: string, report?: ReportData | null) => {
  if (!text || !report?.sections) return text;

  const aliases = new Map<string, string>();

  report.sections.components?.forEach((component, index) => {
    if (component.component_id) {
      aliases.set(component.component_id, componentDisplayName(component, index));
    }
  });

  report.sections.blockers?.forEach((component, index) => {
    if (component.component_id) {
      aliases.set(component.component_id, componentDisplayName(component, index));
    }
  });

  report.sections.recommendations?.forEach((recommendation, index) => {
    if (recommendation.component_id) {
      aliases.set(recommendation.component_id, componentDisplayName(recommendation, index));
    }
  });

  let sanitizedText = text;
  aliases.forEach((label, technicalId) => {
    sanitizedText = sanitizedText.split(technicalId).join(label);
  });

  return sanitizedText;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeDetails = (details: unknown): DetailEntry[] => {
  if (!details) return [];

  if (Array.isArray(details)) {
    return details.map((detail, index) => {
      if (isRecord(detail)) {
        const title = detail.title ?? detail.name ?? detail.label ?? `Detail ${index + 1}`;
        return { title: String(title), value: detail.value ?? detail.description ?? detail.message ?? detail };
      }

      return { title: `Detail ${index + 1}`, value: detail };
    });
  }

  if (isRecord(details)) {
    return Object.entries(details).map(([key, value]) => ({ title: key, value }));
  }

  return [{ title: 'Detail', value: details }];
};

const scoreTone = (score: number) => {
  if (score >= 75) return 'text-[#159866]';
  if (score >= 50) return 'text-[#f59e0b]';
  return 'text-[#e54848]';
};

const ScoreRing = ({ score }: { score: number }) => {
  const { t } = useI18n();
  const safeScore = Math.min(Math.max(score, 0), 100);
  const circumference = 364;

  return (
    <div className="flex shrink-0 flex-col items-center rounded-2xl border border-[#dbe4f2] bg-[#f8faff] p-5 dark:border-white/10 dark:bg-white/5">
      <div className="relative">
        <svg className="h-32 w-32 -rotate-90">
          <circle className="text-[#e3ebf8] dark:text-white/10" strokeWidth="10" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
          <circle
            className={scoreTone(safeScore)}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * safeScore) / 100}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="58"
            cx="64"
            cy="64"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-3xl font-black">{safeScore}%</span>
      </div>
      <p className="mt-2 text-xs font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{t('reports.migrationScore')}</p>
    </div>
  );
};

const securityToneClasses = {
  red: {
    bg: 'bg-[#fff0f0] dark:bg-red-500/10',
    text: 'text-[#e54848] dark:text-red-300',
    border: 'ring-red-200 dark:ring-red-500/20',
    icon: <AlertTriangle size={22} />,
  },
  yellow: {
    bg: 'bg-[#fff9e6] dark:bg-[#f59e0b]/10',
    text: 'text-[#9b4f00] dark:text-[#ffbe4d]',
    border: 'ring-[#ffd36d] dark:ring-[#f59e0b]/25',
    icon: <ShieldAlert size={22} />,
  },
  green: {
    bg: 'bg-[#e9fbf4] dark:bg-[#23d18b]/12',
    text: 'text-[#159866] dark:text-[#67e8b9]',
    border: 'ring-green-200 dark:ring-[#23d18b]/20',
    icon: <ShieldCheck size={22} />,
  },
};

const SecurityPanel = ({ status }: { status: SecurityStatus }) => {
  const { t } = useI18n();
  const tone = securityToneClasses[status.tone];

  return (
    <div className={`rounded-[22px] p-6 shadow-sm ring-1 ${tone.bg} ${tone.text} ${tone.border}`}>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 dark:bg-white/8">
          {tone.icon}
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-70">{t('reports.securityStatus')}</p>
          <h3 className="mt-1 text-3xl font-black">{status.label}</h3>
          <p className="mt-3 text-sm leading-6 opacity-80">{status.description}</p>
        </div>
      </div>
    </div>
  );
};

const metricToneClasses = {
  red: 'bg-[#fff0f0] text-[#e54848] dark:bg-red-500/10 dark:text-red-300',
  blue: 'bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#2f80ed]/12 dark:text-[#8bbdff]',
  green: 'bg-[#e9fbf4] text-[#159866] dark:bg-[#23d18b]/12 dark:text-[#67e8b9]',
  yellow: 'bg-[#fff9e6] text-[#9b4f00] dark:bg-[#f59e0b]/10 dark:text-[#ffbe4d]',
};

const MetricCard = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: keyof typeof metricToneClasses }) => (
  <article className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101d3a]">
    <div className="flex items-center gap-4">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${metricToneClasses[tone]}`}>{icon}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{label}</p>
        <p className="mt-1 text-3xl font-black">{value}</p>
      </div>
    </div>
  </article>
);

const riskBadgeClasses: Record<string, string> = {
  BLOCKER: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/25',
  MAJOR: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25',
  MINOR: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/25',
  INFO: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25',
};

const ComponentFindingCard = ({
  component,
  index,
  report,
}: {
  component: ReportComponent;
  index: number;
  report: ReportData;
}) => {
  const { t, language } = useI18n();
  const risk = component.final_risk ?? component.risk_level ?? 'INFO';
  const status = component.final_status ?? component.overall_status ?? 'NEEDS_REVIEW';
  const reasoningText = getTranslatedComponentField(component, 'reasoning_summary', report, language);
  const actionText = getTranslatedComponentField(component, 'recommended_action', report, language);
  const description = sanitizeReportText(
    [reasoningText, actionText].filter(Boolean).join('\n\n') || t('reports.noReasoning'),
    report,
  );
  const location = locationLabel(component.location);

  return (
    <article className="rounded-2xl border border-[#edf1f8] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-black text-[#111b3f] dark:text-white">
            {componentDisplayName(component, index)}
          </h4>
          <p className="mt-1 text-xs font-bold text-[#8a96b3] dark:text-white/45">
            {[component.plugin, component.component_type, location].filter(Boolean).join(' / ') || t('reports.migrationComponent')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ring-1 ${riskBadgeClasses[risk] ?? riskBadgeClasses.INFO}`}>
            {risk}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-[#64708d] ring-1 ring-[#dbe4f2] dark:bg-white/8 dark:text-white/65 dark:ring-white/10">
            {status}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-[#64708d] dark:text-white/68">{description}</p>
    </article>
  );
};

const RecommendationCard = ({
  recommendation,
  index,
  report,
}: {
  recommendation: ReportRecommendation;
  index: number;
  report: ReportData;
}) => {
  const { t, language } = useI18n();
  const priority = recommendation.priority ?? 'INFO';
  const actionText = getTranslatedRecommendationField(recommendation, 'action', report, language);
  const reasonText = getTranslatedRecommendationField(recommendation, 'reason', report, language);

  return (
    <article className="rounded-2xl border border-[#edf1f8] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-black text-[#111b3f] dark:text-white">
            {componentDisplayName(recommendation, index)}
          </h4>
          <p className="mt-1 text-xs font-bold text-[#8a96b3] dark:text-white/45">
            {recommendation.status || t('reports.recommendedAction')}
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase ring-1 ${riskBadgeClasses[priority] ?? riskBadgeClasses.INFO}`}>
          {priority}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-[#64708d] dark:text-white/68">
        {sanitizeReportText(actionText || reasonText || t('reports.noAction'), report)}
      </p>
    </article>
  );
};

const ContentPanel = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <section className="rounded-[22px] border border-[#dbe4f2] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#101d3a]">
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2f80ed] dark:bg-[#10264d] dark:text-[#8bbdff]">
        {icon}
      </span>
      <h3 className="text-xl font-black">{title}</h3>
    </div>
    {children}
  </section>
);

const InfoLine = ({ label, value }: { label: string; value?: unknown }) => (
  <div className="rounded-2xl border border-[#edf1f8] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/5">
    <p className="text-[10px] font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{label}</p>
    <p className="mt-2 break-all text-sm font-semibold text-[#111b3f] dark:text-white/82">{formatValue(value)}</p>
  </div>
);

const ReportDetailRow = ({ detail, report }: { detail: DetailEntry; report: ReportData }) => {
  const value = typeof detail.value === 'string' ? detail.value : JSON.stringify(detail.value, null, 2);

  return (
    <article className="rounded-2xl border border-[#edf1f8] bg-[#f8faff] p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-black uppercase tracking-wide text-[#8a96b3] dark:text-white/45">{detail.title}</p>
      <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#64708d] dark:text-white/68">
        {sanitizeReportText(value, report)}
      </pre>
    </article>
  );
};

const AISummaryRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('###')) {
      elements.push(
        <h3 key={`h3-${i}`} className="mt-5 text-lg font-black text-[#111b3f] dark:text-white">
          {trimmedLine.replace(/^#+\s/, '')}
        </h3>,
      );
    } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-black text-[#111b3f] dark:text-white">
          {trimmedLine.replace(/\*\*/g, '')}
        </h2>,
      );
    } else if (trimmedLine.startsWith('*')) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].trim().startsWith('*')) {
        listItems.push(
          <li key={`li-${i}`} className="ml-4 text-sm leading-7 text-[#64708d] dark:text-white/68">
            {lines[i].replace(/^\*\s/, '').replace(/\*\*/g, '')}
          </li>,
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="mb-4 list-disc">
          {listItems}
        </ul>,
      );
      i--;
    } else if (trimmedLine === '---') {
      elements.push(<div key={`hr-${i}`} className="my-4 border-t border-[#dbe4f2] dark:border-white/10" />);
    } else if (trimmedLine !== '') {
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-7 text-[#64708d] dark:text-white/68">
          {line.replace(/\*\*/g, '')}
        </p>,
      );
    }

    i++;
  }

  return <div className="space-y-3">{elements}</div>;
};

export default ReportPage;
