import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, X, CheckCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { EMAIL_ERROR, EMAIL_REGEX } from '../../services/validation';

interface VerifyEmailProps {
  onClose?: () => void;
}

const getVerifyErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return response?.data?.error || 'Unable to verify your email.';
};

const VerifyEmail = ({ onClose }: VerifyEmailProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  // Auto-verify if token and email are present in URL
  useEffect(() => {
    const autoVerify = async () => {
      if (!token || !email) {
        setIsVerifying(false);
        setError('Verification link is invalid or missing required parameters.');
        return;
      }

      try {
        const data = await authService.verifyEmail(email, token);
        setSuccess(data.message);
        setError('');
        // Auto-redirect to the login modal after 5 seconds
        setTimeout(() => {
          navigate('/?auth=login');
        }, 5000);
      } catch (error) {
        setError(getVerifyErrorMessage(error));
        setSuccess('');
      } finally {
        setIsVerifying(false);
      }
    };

    autoVerify();
  }, [email, token, navigate]);

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('The verification link is invalid.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError(EMAIL_ERROR);
      return;
    }

    try {
      setIsLoading(true);
      const data = await authService.verifyEmail(email.trim(), token);
      setSuccess(data.message);
      setEmail('');
      // Auto-redirect to the login modal after 5 seconds
      setTimeout(() => {
        navigate('/?auth=login');
      }, 5000);
    } catch (error) {
      setError(getVerifyErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    // Open login modal on home page
    navigate('/?auth=login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop Matching LoginModal */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Main Container Card Matching LoginModal */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 animate-in fade-in zoom-in duration-300">
        {/* Close button inside the card, matching LoginModal */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          type="button"
        >
          <X size={24} />
        </button>

        {isVerifying ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin text-[var(--spectrum-blue)] mx-auto mb-4" size={48} />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Verifying your email
            </h2>
            <p className="text-sm text-slate-500">
              Please wait while we verify your email address.
            </p>
          </div>
        ) : success ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="text-emerald-500" size={64} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Email verified successfully!
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Your account has been verified. Redirecting to login...
            </p>
            <button
              type="button"
              onClick={() => navigate('/?auth=login')}
              className="w-full py-4 bg-[var(--spectrum-blue)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Go to login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Verify your email
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Enter your email address to verify your account.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleManualVerify}>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-xs font-bold text-center animate-shake">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[var(--spectrum-blue)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verify email'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/?auth=login')}
                className="text-sm font-bold text-[var(--spectrum-blue)] hover:underline"
              >
                Back to login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;