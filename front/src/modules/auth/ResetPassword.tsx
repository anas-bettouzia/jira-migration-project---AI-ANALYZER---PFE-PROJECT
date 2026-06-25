import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, Mail, X } from 'lucide-react';
import { authService } from '../../services/authService';
import { useTranslation } from '../../i18n/TranslationProvider';
import { EMAIL_REGEX, PASSWORD_REGEX } from '../../services/validation';

interface ResetPasswordProps {
  isModal?: boolean;
  onClose?: () => void;
}

const getResetErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return response?.data?.error || fallback;
};

const ResetPassword = ({ isModal = false, onClose }: ResetPasswordProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      setError(t('resetLinkInvalid'));
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError(t('invalidEmail'));
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError(t('passwordRequirements'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    const fallbackErrorMessage = t('unableResetPassword');

    try {
      setIsLoading(true);
      const data = await authService.resetPassword(email.trim(), token, password);
      setSuccess(data.message);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(getResetErrorMessage(error, fallbackErrorMessage));
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
    ? 'fixed inset-0 z-50 flex items-center justify-center p-4'
    : 'min-h-screen flex items-center justify-center bg-[#eef2fb] dark:bg-[#071126] px-4 py-12 font-sans';

  const cardClass = isModal
    ? 'relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 animate-in fade-in zoom-in duration-300'
    : 'w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl border border-transparent dark:bg-slate-900 dark:border-slate-800';

  return (
    <div className={wrapperClass}>
      {isModal && (
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
      )}

      <div className={cardClass}>
        {/* Close button inside the card, matching LoginModal */}
        {isModal && (
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            type="button"
          >
            <X size={24} />
          </button>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('resetPasswordTitle')}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {t('resetPasswordDesc')}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">
              {t('loginModalEmailLabel')}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                placeholder={t('loginModalEmailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">
              {t('newPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                placeholder={t('loginModalPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">
              {t('confirmNewPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                placeholder={t('loginModalPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center animate-shake">{error}</p>}
          {success && <p className="text-emerald-600 text-xs font-bold text-center">{success}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[var(--spectrum-blue)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : t('updatePassword')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/?auth=login')}
            className="text-sm font-bold text-[var(--spectrum-blue)] hover:underline"
          >
            {t('backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;