import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  ArrowRight,
  Shield,
  LogOut,
  UploadCloud,
  FileText,
  Brain,
  CheckCircle2,
  Database,
  GitBranch,
  Sparkles,
  ChevronRight
} from 'lucide-react';

import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';
import LoginModal from '../auth/LoginModal';
import { useAuthStore } from '../../store/useAuthStore';

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();

  // Gestion du scroll pour la navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
    document.documentElement.classList.toggle('dark');
  };

  const handleMainAction = () => {
    isAuthenticated ? navigate('/analysis') : setIsModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Variants pour Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#020617] transition-colors duration-500 font-sans text-slate-900 dark:text-slate-100">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/20" />
        <div className="absolute right-[-10%] top-1/4 h-[400px] w-[400px] rounded-full bg-orange-400/5 blur-[100px] dark:bg-orange-500/10" />
        <div className="absolute left-[-5%] bottom-1/4 h-[400px] w-[400px] rounded-full bg-cyan-400/5 blur-[100px] dark:bg-cyan-500/10" />
      </div>

      {/* NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
        ? 'bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-3' 
        : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <div className="relative">
                <img
                    src={logoSpectrum}
                    alt="Spectrum Groupe"
                    className={`h-10 transition-all duration-300 group-hover:scale-105 ${darkMode ? 'brightness-200' : ''}`}
                />
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-10 text-sm font-semibold text-slate-600 dark:text-slate-400">
            {['features', 'pipeline', 'reports'].map((id) => (
              <button 
                key={id}
                onClick={() => scrollToSection(id)} 
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors capitalize relative group"
              >
                {id}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-yellow-400 hover:ring-2 ring-slate-200 dark:ring-slate-700 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/analysis')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl hover:shadow-xl transition-all active:scale-95"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="pt-40 pb-20 px-6">
        <section className="max-w-7xl mx-auto">
          <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] items-center">
            
            {/* Left Content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-bold mb-8 border border-blue-100 dark:border-blue-800 animate-pulse">
                <Sparkles size={14} />
                <span>Propulsé par l'Intelligence Artificielle</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8">
                Auditez votre <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                  Migration Jira
                </span> <br />
                en un clic.
              </h1>

              <p className="max-w-xl mx-auto lg:mx-0 text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-10">
                Analysez vos exports Data Center, identifiez les bloqueurs critiques et générez des rapports d'aide à la décision grâce à notre moteur RAG hybride.
              </p>

              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <button
                  onClick={handleMainAction}
                  className="group px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/30 transition-all hover:-translate-y-1"
                >
                  {isAuthenticated ? "Accéder à l'analyse" : "Démarrer l'audit gratuit"}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('pipeline')}
                  className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Découvrir le process
                </button>
              </div>

              {/* Stats rapides */}
              <div className="mt-12 grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800 pt-10">
                {[
                  { label: 'Précision IA', value: '99%' },
                  { label: 'Format', value: 'PDF / JSON' },
                  { label: 'Vitesse', value: '< 2min' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 uppercase tracking-wider font-bold">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Preview Card (Bento Style) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative group"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-cyan-400/20 rounded-[3rem] blur-2xl group-hover:opacity-100 transition-opacity opacity-0" />
              
              <div className="relative rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-8 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black">Ready for Cloud</h3>
                    <p className="text-sm text-slate-500">Instance : Spectrum-Prod-DC</p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-black border border-green-100 dark:border-green-500/20">
                    ANALYSE TERMINÉE
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase">Score global</p>
                    <div className="text-4xl font-black text-blue-600 mt-2">84<span className="text-sm text-slate-400">/100</span></div>
                  </div>
                  <div className="p-6 rounded-3xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                    <p className="text-xs font-bold text-red-500 uppercase">Blockers</p>
                    <div className="text-4xl font-black text-red-600 mt-2">02</div>
                  </div>
                </div>

                <div className="space-y-3">
                    {['Groovy Scripts', 'Custom Fields', 'Marketplace Apps'].map((item, i) => (
                        <div key={item} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                            <span className="font-bold text-sm">{item}</span>
                            <CheckCircle2 size={18} className={i === 2 ? "text-orange-500" : "text-green-500"} />
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <Brain size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-blue-300">Recommandation IA</p>
                            <p className="text-xs font-medium italic">"Mettre à jour ScriptRunner vers v6.4..."</p>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-500" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="mt-40">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <p className="text-blue-600 font-black text-sm uppercase tracking-[0.3em] mb-4">Fonctionnalités</p>
            <h2 className="text-4xl md:text-5xl font-black">Tout ce qu'il vous faut pour réussir.</h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: <UploadCloud size={28} />, title: 'Import Multi-format', desc: 'Prend en charge les exports XML, les scripts Groovy et les archives ZIP complexes de Jira DC.', color: 'blue' },
              { icon: <Shield size={28} />, title: 'Analyse de Risque', desc: 'Identification automatique des API dépréciées et des incompatibilités de schémas Cloud.', color: 'green' },
              { icon: <Brain size={28} />, title: 'Intelligence RAG', desc: 'Croisement de vos données avec la documentation Atlassian officielle mise à jour en temps réel.', color: 'purple' },
            ].map((f) => (
              <motion.div 
                key={f.title}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 bg-${f.color}-50 dark:bg-${f.color}-500/10 text-${f.color}-600`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-black mb-4">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PIPELINE SECTION */}
        <section id="pipeline" className="mt-40 rounded-[3rem] bg-slate-900 dark:bg-slate-950 p-12 lg:p-20 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] -z-0" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-blue-400 font-black text-sm uppercase tracking-[0.3em] mb-4">Pipeline</p>
              <h2 className="text-4xl md:text-5xl font-black mb-8">Un flux de travail <br />entièrement automatisé.</h2>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Extraction', text: 'Analyse profonde de la structure XML et Groovy.' },
                  { step: '02', title: 'Mapping', text: 'Correspondance avec les schémas Jira Cloud.' },
                  { step: '03', title: 'Evaluation IA', text: 'Validation par Gemini Pro & Base de connaissances RAG.' }
                ].map(s => (
                  <div key={s.step} className="flex gap-6 items-start group">
                    <span className="text-3xl font-black text-blue-500/30 group-hover:text-blue-500 transition-colors">{s.step}</span>
                    <div>
                      <h4 className="text-lg font-bold mb-1">{s.title}</h4>
                      <p className="text-slate-400">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               {[Database, GitBranch, Brain, FileText].map((Icon, idx) => (
                 <div key={idx} className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 hover:bg-white/10 transition-colors">
                    <Icon size={32} className="text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Service {idx + 1}</span>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mt-40 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/20 blur-[120px] -z-10" />
          <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">
            Prêt à simplifier votre <br /> passage au Cloud ?
          </h2>
          <button
            onClick={handleMainAction}
            className="px-12 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/40 hover:-translate-y-1 inline-flex items-center gap-3"
          >
            Commencer l'analyse maintenant
            <ArrowRight size={22} />
          </button>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 text-center">
        <div className="flex justify-center items-center gap-6 mb-6">
            <img src={logoSpectrum} alt="Logo" className={`h-6 opacity-50 ${darkMode ? 'brightness-200' : ''}`} />
        </div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">
          © 2026 Spectrum Groupe • Jira Cloud Migration Intelligence
        </p>
      </footer>

      {/* LOGIN MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;