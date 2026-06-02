import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileJson,
  FileText,
  Loader2,
  LogOut,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Info,
  Download
} from 'lucide-react';

import { FileUploader } from '../../shared/components/FileUploader';
import { useJobStatus } from '../../hooks/useJobStatus';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../core/api';

export const AnalysisPage: React.FC = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const jobStatus = useJobStatus(jobId);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const result = jobStatus?.result;
  const summary = result?.summary;
  const reportId = result?.report_id;

  const progress = useMemo(() => {
    if (!jobStatus?.status) return 10;
    if (jobStatus.status === 'QUEUED') return 25;
    if (jobStatus.status === 'RUNNING') return 65;
    if (jobStatus.status === 'COMPLETED') return 100;
    if (jobStatus.status === 'FAILED') return 100;
    return 40;
  }, [jobStatus?.status]);

  const resetAnalysis = () => setJobId(null);

  const handleLogout = () => {
    logout();
    navigate('/');
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
      console.error(`Erreur téléchargement ${type}:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white transition-colors duration-500">
      {/* HEADER OPTIMISÉ */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-bold group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Retour</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={resetAnalysis}
              className="hidden sm:flex px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-blue-600 hover:text-white transition-all items-center gap-2"
            >
              <RotateCcw size={16} />
              Nouvelle analyse
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-bold hover:bg-red-100 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-6">
        {/* HERO SECTION ANALYSE */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-4">
            <ShieldAlert size={14} />
            Assistant de Migration
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Analyse de <span className="text-blue-600">compatibilité</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
            Déposez vos exports Jira Data Center. Notre IA analyse la structure, les scripts et les apps pour sécuriser votre passage sur le Cloud.
          </p>
        </motion.section>

        <AnimatePresence mode="wait">
          {!jobId ? (
            <motion.div 
              key="uploader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-10 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Import des données</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Fichiers supportés : .zip, .xml, .groovy</p>
                    </div>
                </div>
                <FileUploader onUploadSuccess={(id) => setJobId(id)} />
              </div>

              <div className="space-y-4">
                <InfoCard
                  title="Pipeline Automatisé"
                  description="Extraction, Mapping de schémas et validation IA."
                  icon={<Clock className="text-blue-600" />}
                />
                <InfoCard
                  title="Base RAG"
                  description="Comparaison avec 10k+ pages de doc Atlassian."
                  icon={<ShieldAlert className="text-orange-500" />}
                />
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-950 text-white">
                    <h4 className="font-black mb-2 flex items-center gap-2">
                        <Info size={18} className="text-blue-400" />
                        Note de sécurité
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Vos données sont traitées localement pour le parsing. Seuls les métadonnées anonymisées sont transmises à l'IA.
                    </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* SUIVI DU JOB CARTE */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl p-8 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${jobStatus?.status === 'FAILED' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} dark:bg-slate-800`}>
                        {jobStatus?.status === 'COMPLETED' ? <CheckCircle2 size={32} /> : <Loader2 size={32} className="animate-spin" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black">État du Pipeline</h2>
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">ID: {jobId}</p>
                    </div>
                  </div>
                  <StatusBadge status={jobStatus?.status} />
                </div>

                {/* PROGRESS BAR AMÉLIORÉE */}
                <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full ${
                        jobStatus?.status === 'FAILED' ? 'bg-red-500' : 
                        jobStatus?.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-600'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>Initialisation</span>
                    <span>Analyse IA</span>
                    <span>Rapport final</span>
                </div>
              </div>

              {/* RÉSULTATS (SI DISPONIBLES) */}
              {jobStatus?.status === 'COMPLETED' && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="grid gap-6"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Migration Score" value={`${summary?.migration_score ?? 0}%`} tone="blue" />
                    <StatCard label="Bloqueurs" value={summary?.blocker_count ?? 0} tone="red" />
                    <StatCard label="Composants" value={summary?.total_components ?? 0} tone="slate" />
                    <StatCard label="IA Validée" value="Oui" tone="green" />
                  </div>

                  <div className="bg-gradient-to-r from-blue-700 to-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <CheckCircle2 size={200} />
                    </div>
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                      <div className="max-w-2xl text-center lg:text-left">
                        <h3 className="text-3xl font-black mb-4">Prêt pour l'étape suivante ?</h3>
                        <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                          {summary?.migration_recommendation || "L'analyse est terminée. Consultez le rapport pour découvrir la stratégie de migration suggérée par notre IA."}
                        </p>
                        <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                            <MetaItem label="Analyse ID" value={result?.analysis_id} />
                            <MetaItem label="Report ID" value={result?.report_id} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full lg:w-72">
                        <button
                          onClick={() => navigate(`/reports/${reportId}`)}
                          className="w-full py-4 bg-white text-blue-900 font-black rounded-2xl hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                        >
                          Ouvrir le rapport <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => downloadFile('pdf')} className="py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                                <Download size={14} /> PDF
                            </button>
                            <button onClick={() => downloadFile('json')} className="py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                                <FileJson size={14} /> JSON
                            </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

/* SOUS-COMPOSANTS EXTRAITS POUR LA CLARTÉ */

const StatusBadge = ({ status }: { status?: string }) => {
  const isPending = status === 'QUEUED' || status === 'RUNNING' || !status;
  return (
    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
      status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
      status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
    }`}>
      {isPending && <Loader2 size={14} className="animate-spin" />}
      {status || 'INITIALIZING'}
    </div>
  );
};

const StatCard = ({ label, value, tone }: { label: string, value: string | number, tone: any }) => {
  const colors = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    slate: 'text-slate-600 bg-slate-50 dark:bg-slate-800',
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-2">{label}</p>
      <div className={`text-2xl font-black inline-block px-3 py-1 rounded-lg ${colors[tone as keyof typeof colors]}`}>
        {value}
      </div>
    </div>
  );
};

const InfoCard = ({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex gap-4">
    <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h4 className="font-black text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

const MetaItem = ({ label, value }: { label: string, value?: string }) => (
    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-[10px] font-black text-blue-300 uppercase opacity-70 mb-0.5">{label}</p>
        <p className="text-[11px] font-mono opacity-90">{value?.substring(0, 12)}...</p>
    </div>
);
export default AnalysisPage;