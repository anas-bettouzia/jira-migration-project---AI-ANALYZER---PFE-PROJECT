import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Lock, Mail, Loader2 } from 'lucide-react'; 
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';
import GoogleSignInButton from '../../shared/components/GoogleSignInButton';
import type { AuthResponse } from '../../shared/types/auth';
import { EMAIL_ERROR, EMAIL_REGEX } from '../../services/validation';

const Login = () => {
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);

  // Theme toggle
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
    setSuccess('');

    try {
      const data = await authService.login(email, password);
      setToken(data.token);
      navigate('/analysis'); 
    } catch {
      setError('Invalid credentials or unable to reach the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    if (!EMAIL_REGEX.test(email.trim())) {
      setError(EMAIL_ERROR);
      return;
    }

    try {
      setIsResetLoading(true);
      const data = await authService.requestPasswordReset(email.trim());
      setSuccess(data.message);
    } catch (error) {
      const response = (error as { response?: { data?: { error?: string } } }).response;
      setError(response?.data?.error || 'Unable to send the password reset link.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleGoogleAuthenticated = useCallback(
    (data: AuthResponse) => {
      setToken(data.token);
      navigate('/analysis');
    },
    [navigate, setToken]
  );

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <div className="min-h-screen flex transition-colors duration-300 bg-slate-50 dark:bg-[#0f172a] font-sans">
      
      {/* Theme toggle button */}
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
              Jira information management expertise
            </p>
          </div>

          {/* Login card */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-700">
            <div className="mb-6">
              <GoogleSignInButton
                theme={darkMode ? 'filled_black' : 'outline'}
                width={360}
                onAuthenticated={handleGoogleAuthenticated}
                onError={handleGoogleError}
              />
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  or
                </span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              
              <div className="space-y-5">
                {/* Email field */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Work email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f39200] outline-none transition-all"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Champ Password */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Password
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

              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium border border-emerald-100 dark:border-emerald-800 text-center">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[var(--spectrum-blue)] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetLoading}
                className="text-sm font-bold text-[var(--spectrum-blue)] hover:underline disabled:opacity-60"
              >
                {isResetLoading ? 'Sending link...' : 'Forgot password?'}
              </button>
            </div>
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
