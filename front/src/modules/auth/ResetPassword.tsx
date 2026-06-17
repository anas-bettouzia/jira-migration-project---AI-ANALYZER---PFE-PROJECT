import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Lock, Mail, ShieldAlert, X } from 'lucide-react';
import { authService } from '../../services/authService';
import logoSpectrum from '../../assets/img/logo-spectrum-groupe.png';
import { EMAIL_ERROR, EMAIL_REGEX, PASSWORD_ERROR, PASSWORD_REGEX } from '../../services/validation';

interface ResetPasswordProps {
  isModal?: boolean;
  onClose?: () => void;
}

const getResetErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return response?.data?.error || 'Impossible de reinitialiser le mot de passe.';
};

const ResetPassword = ({ isModal = false, onClose }: ResetPasswordProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Le lien de reinitialisation est invalide.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError(EMAIL_ERROR);
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_ERROR);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    try {
      setIsLoading(true);
      const data = await authService.resetPassword(email.trim(), token, password);
      setSuccess(data.message);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(getResetErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate('/login');
  };

  const wrapperClass = isModal
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4'
    : 'min-h-screen flex items-center justify-center bg-slate-950/95 px-4 py-12 font-sans';

  const cardClass = isModal
    ? 'relative w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-900/10 dark:bg-slate-950 dark:border dark:border-slate-800'
    : 'rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-900/10 dark:bg-slate-950 dark:border dark:border-slate-800';

  return (
    <div className={wrapperClass}>
      {isModal && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/80 p-2 text-slate-600 shadow-lg transition hover:bg-white"
        >
          <X size={20} />
        </button>
      )}

      <div className={cardClass}>
        <div className="text-center mb-8">
          <img src={logoSpectrum} alt="Spectrum Groupe" className="h-14 w-auto mx-auto mb-5" />
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Nouveau mot de passe
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Choisissez un mot de passe robuste pour recuperer votre compte.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute inset-y-0 left-3 my-auto text-slate-400" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f39200] outline-none transition-all"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute inset-y-0 left-3 my-auto text-slate-400" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f39200] outline-none transition-all"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute inset-y-0 left-3 my-auto text-slate-400" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f39200] outline-none transition-all"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-800">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium border border-emerald-100 dark:border-emerald-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[var(--spectrum-blue)] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Mettre a jour'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/?auth=login')}
            className="text-sm font-bold text-[var(--spectrum-blue)] hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
