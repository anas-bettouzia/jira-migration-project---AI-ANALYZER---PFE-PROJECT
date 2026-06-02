import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Lock, Mail, Loader2 } from 'lucide-react'; 
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';

const Login = () => {
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);

  // Gestion du thème
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await authService.login(email, password);
      setToken(data.token);
      navigate('/analysis'); 
    } catch (err: any) {
      setError('Identifiants invalides ou serveur injoignable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex transition-colors duration-300 bg-slate-50 dark:bg-[#0f172a] font-sans">
      
      {/* Bouton Toggle Thème */}
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-6 right-6 p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-600 dark:text-yellow-400 hover:scale-110 transition-transform"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="flex flex-col justify-center items-center w-full px-4 py-12">
        <div className="max-w-md w-full space-y-8">
          
          {/* Header & Logo */}
          <div className="text-center">
            <img 
              src={logoSpectrum} 
              alt="Spectrum Groupe" 
              className={`h-20 w-auto mx-auto mb-6 transition-all ${darkMode ? 'brightness-200' : ''}`}
            />
            <h1 className="text-3xl font-extrabold text-[#004a99] dark:text-blue-400 tracking-tight">
              Migration Assistant
            </h1>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Expertise en gestion de l'information Jira
            </p>
          </div>

          {/* Carte de Login */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-700">
            <form className="space-y-6" onSubmit={handleSubmit}>
              
              <div className="space-y-5">
                {/* Champ Email */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    E-mail professionnel
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f39200] outline-none transition-all"
                      placeholder="nom@spectrumgroupe.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Champ Password */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock size={18} />
                    </span>
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f39200] outline-none transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-800 text-center animate-shake">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[var(--spectrum-blue)] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : 'Se connecter'}
              </button>
            </form>
          </div>

          <div className="text-center space-y-4">
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              © {new Date().getFullYear()} Spectrum Groupe • Information Management Experts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;