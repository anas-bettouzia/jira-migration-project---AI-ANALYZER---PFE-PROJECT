import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileJson, 
  AlertTriangle, 
  Sparkles,
  Layers,
  ShieldCheck,
  Zap
} from 'lucide-react';

import { reportService, type ReportData } from '../../services/reportService';

export const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
        if (!reportId) return;
        try {
            const data = await reportService.getReport(reportId);
            console.log('📊 Rapport complet reçu:', data);
            console.log('📊 Statistics:', data.statistics);
            console.log('📊 Clés de statistics:', Object.keys(data.statistics || {}));
            console.log('📊 Blocker count:', data?.statistics?.blocker_count);
            console.log('📊 Total components:', data?.statistics?.total_components);
            console.log('📊 Security status:', data?.statistics?.security_status);
            console.log('📊 Compatible count:', data?.statistics?.compatible_count);
            console.log('📊 Incompatible count:', data?.statistics?.incompatible_count);
            setReport(data);
        } catch (error) {
            console.error("Erreur chargement rapport:", error);
        } finally {
            setLoading(false);
        }
        };
        fetchReport();
    }, [reportId]);

    const handleDownload = async (type: 'pdf' | 'json') => {
        if (reportId) {
        await reportService.downloadReport(reportId, type);
        }
    };

    const formatValue = (value: string | number | undefined | null) => {
      return value === undefined || value === null ? '-' : value;
    };

    const formatPercentage = (value: number | undefined | null) => {
      return value === undefined || value === null ? '-' : `${value}%`;
    };

    const reportScore = report?.statistics?.migration_score ?? report?.migration_score;
    const reportBlockers = report?.statistics?.blocker_count ?? report?.blocker_count;
    const reportItems = report?.statistics?.total_components ?? report?.total_components;
    
    // Calculer le statut de sécurité basé sur les métriques disponibles
    const calculateSecurityStatus = () => {
      const incompatible = report?.statistics?.incompatible_count ?? 0;
      const blocker = report?.statistics?.blocker_count ?? 0;
      const major = report?.statistics?.major_count ?? 0;
      
      if (incompatible > 0 || blocker > 0) return { label: 'Critique', color: 'red', icon: '🔴' };
      if (major > 0) return { label: 'Attention', color: 'yellow', icon: '🟡' };
      return { label: 'Optimal', color: 'green', icon: '🟢' };
    };
    
    const reportSecurity = calculateSecurityStatus();
    const reportRecommendation = report?.statistics?.migration_recommendation ?? report?.migration_recommendation;

    const hasSummary = Boolean(report?.summary && typeof report.summary === 'string' && report.summary.length > 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#020617]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-500 font-bold">Chargement du rapport détaillé...</p>
      </div>
    );
  }

  if (!report) return <div className="p-20 text-center font-bold">Rapport introuvable.</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors"
          >
            <ArrowLeft size={18} /> Retour
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleDownload('pdf')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 title='Télécharger PDF'"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => handleDownload('json')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 title='Télécharger JSON'"
            >
              <FileJson size={20} />
            </button>
            <span className="ml-4 text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              ID: {reportId?.substring(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-10 px-6">
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
            <div className="relative mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle className="text-slate-100 dark:text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64"/>
                <circle className="text-blue-600" strokeWidth="10" strokeDasharray={364} strokeDashoffset={364 - (364 * (reportScore ?? 0)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-3xl font-black">
                {formatPercentage(reportScore)}
              </span>
            </div>
            <h3 className="font-black text-xl text-center">Score de migration</h3>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <Sparkles className="absolute top-4 right-4 text-blue-300/30" size={60} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-400/20 rounded-lg"><Zap size={20} /></div>
                <h3 className="text-xl font-black">Recommandation stratégique</h3>
              </div>
              <p className="text-blue-50 leading-relaxed text-lg italic">
                {reportRecommendation || 'Aucune recommandation stratégique disponible pour ce rapport.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <DetailStat icon={<AlertTriangle className="text-red-500"/>} label="Blockers critiques" value={formatValue(reportBlockers)} color="red" />
          <DetailStat icon={<Layers className="text-blue-500"/>} label="Éléments analysés" value={formatValue(reportItems)} color="blue" />
          <SecurityStat status={reportSecurity} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-12">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
            <h3 className="text-2xl font-black mb-4">Aperçu du rapport</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard label="Report ID" value={report.report_id} />
              <InfoCard label="Analyse ID" value={report.analysis_id ?? '-'} />
              <InfoCard label="Matrix ID" value={report.matrix_id ?? '-'} />
              <InfoCard label="Modèle IA" value={report.ai_model ?? 'Non renseigné'} />
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard label="IA utilisée" value={report.ai_used ? 'Oui' : 'Non'} />
              <InfoCard label="Erreur IA" value={report.ai_error ?? 'Aucune'} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
            <h3 className="text-2xl font-black mb-4">Statut du rapport</h3>
            <div className="space-y-4 text-slate-700 dark:text-slate-200">
              <DetailLine label="Résumé disponible" value={hasSummary ? 'Oui' : 'Non'} />
              <DetailLine label="Dernière mise à jour" value={formatValue(report.updated_at ?? report.created_at)} />
              <DetailLine label="Source du rapport" value={report.report_source ?? 'Backend'} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
          <h3 className="text-2xl font-black mb-6">Détails et observations</h3>

          {report.ai_summary && (
            <div className="mb-5 p-6 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
              <h4 className="text-lg font-bold mb-4 text-blue-900 dark:text-blue-100">Résumé IA</h4>
              <AISummaryRenderer content={report.ai_summary} />
            </div>
          )}

          {report.ai_insights && (
            <div className="mb-5 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <h4 className="text-lg font-bold mb-2">Insights IA</h4>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {report.ai_insights}
              </p>
            </div>
          )}

          {report.details ? (
            <div className="space-y-4">
              {Array.isArray(report.details) ? (
                report.details.map((detail, index) => (
                  <ReportDetailRow key={index} detail={detail} />
                ))
              ) : typeof report.details === 'object' ? (
                Object.entries(report.details).map(([key, value]) => (
                  <ReportDetailRow key={key} detail={{ title: key, value }} />
                ))
              ) : (
                <ReportDetailRow detail={{ title: 'Détail', value: report.details }} />
              )}
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-200">Aucun détail de rapport n'est disponible pour ce rapport. Vérifiez que le rapport a bien été généré et enregistré.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const DetailStat = ({ icon, label, value, color }: any) => {
  const colorClasses: any = {
    red: "bg-red-50 dark:bg-red-900/20",
    blue: "bg-blue-50 dark:bg-blue-900/20",
    green: "bg-green-50 dark:bg-green-900/20"
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-black tracking-widest">{label}</p>
        <p className="text-4xl font-black">{value}</p>
      </div>
    </div>
  );
};

const SecurityStat = ({ status }: { status: { label: string; color: string; icon: string } }) => {
  const colorMap: any = {
    red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
    yellow: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" },
    green: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" }
  };

  const colors = colorMap[status.color] || colorMap.green;

  return (
    <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 ${colors.border}`}>
      <div className={`p-3 rounded-xl ${colors.bg}`}>
        <ShieldCheck className={`${colors.text}`} size={20} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Statut sécurité</p>
        <p className={`text-4xl font-black ${colors.text}`}>{status.label}</p>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value?: string | number }) => (
  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4 shadow-sm">
    <p className="text-xs uppercase text-slate-500 tracking-widest font-bold mb-2">{label}</p>
    <p className="text-sm text-slate-900 dark:text-slate-100 font-semibold break-all">{value ?? '-'}</p>
  </div>
);

const DetailLine = ({ label, value }: { label: string; value?: string | number }) => (
  <div className="rounded-3xl bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-800">
    <p className="text-xs uppercase tracking-widest text-slate-500 font-black mb-2">{label}</p>
    <p className="text-sm text-slate-700 dark:text-slate-200">{value ?? '-'}</p>
  </div>
);

const ReportDetailRow = ({ detail }: { detail: any }) => {
  const title = detail.title || detail.name || detail.label || 'Détail';
  const value = detail.value ?? detail.description ?? detail.message ?? detail;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-3">
        <span className="text-sm uppercase tracking-widest text-slate-500 font-black">{title}</span>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>
    </div>
  );
};

const AISummaryRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Titres H3 (###)
    if (line.startsWith('###')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-black text-blue-900 dark:text-blue-100 mt-5 mb-3">
          {line.replace(/^#+\s/, '')}
        </h3>
      );
    }
    // Titres H2 (**)
    else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-black text-blue-900 dark:text-blue-100 mb-3">
          {line.replace(/\*\*/g, '')}
        </h2>
      );
    }
    // Listes à puces (*)
    else if (line.trim().startsWith('*')) {
      const listItems = [];
      while (i < lines.length && lines[i].trim().startsWith('*')) {
        listItems.push(
          <li key={`li-${i}`} className="ml-4 mb-2 text-slate-700 dark:text-slate-200">
            {lines[i].replace(/^\*\s/, '').replace(/\*\*/g, '')}
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc mb-4">
          {listItems}
        </ul>
      );
      i--;
    }
    // Séparateurs (---)
    else if (line.trim() === '---') {
      elements.push(<div key={`hr-${i}`} className="border-t border-blue-200 dark:border-blue-800 my-4" />);
    }
    // Texte normal
    else if (line.trim() !== '') {
      elements.push(
        <p key={`p-${i}`} className="text-slate-700 dark:text-slate-200 leading-relaxed mb-3">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-2">{elements}</div>;
};

export default ReportPage;