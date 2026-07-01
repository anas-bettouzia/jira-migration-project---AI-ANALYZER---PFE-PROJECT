// src/modules/auth/LoginModal.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Lock, Mail, Loader2, X, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import GoogleSignInButton from '../../shared/components/GoogleSignInButton';
import { useI18n } from '../../i18n';
import type { AuthResponse } from '../../shared/types/auth';
import { EMAIL_REGEX, PASSWORD_REGEX } from '../../services/validation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return response?.data?.error || fallback;
};

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [recaptchaToken, setRecaptchaToken] = useState<string | undefined>(undefined);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);

  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const { t, language } = useI18n();
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  const recaptchaLocale = language === 'fr' ? 'fr' : 'en';
  console.log('LoginModal: VITE_RECAPTCHA_SITE_KEY=', RECAPTCHA_SITE_KEY);

  const resetFeedback = () => {
    setError('');
    setSuccess('');
    setRegistrationSuccess(false);
  };

  const resetToLogin = useCallback(() => {
    setIsForgotPassword(false);
    setIsLogin(true);
    setError('');
    setSuccess('');
    setRegistrationSuccess(false);
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRecaptchaToken(undefined);
    setRecaptchaWidgetId(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetFeedback();

    if (isForgotPassword) {
      if (!EMAIL_REGEX.test(email.trim())) {
        setError(t('invalidEmail'));
        setIsLoading(false);
        return;
      }

      try {
        const data = await authService.requestPasswordReset(email.trim(), language);
        setSuccess(data.message);
      } catch (error) {
        setError(getAuthErrorMessage(error, t('loginModalRequestFailed')));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!isLogin) {
      if (!username.trim()) {
        setError(t('usernameRequired'));
        setIsLoading(false);
        return;
      }

      if (!EMAIL_REGEX.test(email.trim())) {
        setError(t('invalidEmail'));
        setIsLoading(false);
        return;
      }

      if (!PASSWORD_REGEX.test(password)) {
        setError(t('passwordRequirements'));
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError(t('passwordsDoNotMatch'));
        setIsLoading(false);
        return;
      }
    }

    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      setError(t('loginModalCompleteRecaptcha'));
      setIsLoading(false);
      return;
    }

      try {
      if (isLogin) {
        const data = await authService.login(email, password, recaptchaToken);
        setToken(data.token);
        onClose();
        navigate('/analysis');
      } else {
        const data = await authService.register(email, username, password, recaptchaToken, language);
        // Do not auto-login: account must be verified first.
        setSuccess(data.message);
        setRegistrationSuccess(true);
      }
    } catch (error) {
      setError(getAuthErrorMessage(error, t('loginModalRequestFailed')));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    resetFeedback();
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleGoogleAuthenticated = useCallback(
    (data: AuthResponse) => {
      if (data.user) {
        setToken(data.token, data.user);
      } else {
        setToken(data.token);
      }
      onClose();
      navigate('/analysis');
    },
    [navigate, onClose, setToken]
  );

  useEffect(() => {
    let timer: number | undefined;

    if (isForgotPassword && success) {
      setCountdown(5);
      timer = window.setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (timer) clearInterval(timer);
            resetToLogin();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isForgotPassword, success]);

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  useEffect(() => {
    // Always clean up reCAPTCHA when language changes
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }

    const recaptchaScripts = document.querySelectorAll('script[src*="recaptcha/api.js"]');
    recaptchaScripts.forEach((script) => script.remove());

    // Clear reCAPTCHA globals so the widget reloads correctly
    if ((window as any).grecaptcha) {
      delete (window as any).grecaptcha;
    }
    if ((window as any).___grecaptcha_cfg) {
      delete (window as any).___grecaptcha_cfg;
    }

    setRecaptchaWidgetId(null);
    setRecaptchaToken(undefined);
  }, [recaptchaLocale]);

  useEffect(() => {
    console.log('LoginModal useEffect recaptcha, site key=', RECAPTCHA_SITE_KEY, 'widgetId=', recaptchaWidgetId, 'locale=', recaptchaLocale);
    if (!RECAPTCHA_SITE_KEY) return;
    if (typeof window === 'undefined') return;

    const renderRecaptcha = () => {
      const grecaptcha = (window as any).grecaptcha;
      console.log('renderRecaptcha called, grecaptcha=', grecaptcha, 'widgetId=', recaptchaWidgetId);
      if (!grecaptcha) return;

      const enterpriseRender = grecaptcha.enterprise && grecaptcha.enterprise.render ? grecaptcha.enterprise.render : undefined;
      const normalRender = grecaptcha.render ? grecaptcha.render : undefined;

      if (enterpriseRender && recaptchaWidgetId === null) {
        try {
          const widgetId = enterpriseRender('recaptcha-container', {
            sitekey: RECAPTCHA_SITE_KEY,
            callback: (token: string) => {
              console.log('recaptcha token callback', token);
              setRecaptchaToken(token);
            },
            'error-callback': () => {
              console.error('reCAPTCHA error callback (enterprise)');
              setError(t('loginModalRecaptchaFailed'));
              setRecaptchaToken(undefined);
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired callback (enterprise)');
              setRecaptchaToken(undefined);
            },
          });
          console.log('reCAPTCHA enterprise widget rendered', widgetId);
          setRecaptchaWidgetId(widgetId);
          return;
        } catch (err) {
          console.error('Unable to render reCAPTCHA enterprise', err);
        }
      }

      if (normalRender && recaptchaWidgetId === null) {
        try {
          const widgetId = normalRender('recaptcha-container', {
            sitekey: RECAPTCHA_SITE_KEY,
            callback: (token: string) => {
              console.log('recaptcha token callback', token);
              setRecaptchaToken(token);
            },
            'error-callback': () => {
              console.error('reCAPTCHA error callback');
              setError(t('loginModalRecaptchaFailed'));
              setRecaptchaToken(undefined);
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired callback');
              setRecaptchaToken(undefined);
            },
          });
          console.log('reCAPTCHA widget rendered', widgetId);
          setRecaptchaWidgetId(widgetId);
        } catch (err) {
          console.error('Unable to render reCAPTCHA', err);
        }
      }
    };

    // Always create a fresh script with the current language
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=${recaptchaLocale}`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-recaptcha', RECAPTCHA_SITE_KEY);
    script.setAttribute('data-recaptcha-lang', recaptchaLocale);
    document.head.appendChild(script);

    script.onload = () => {
      console.log('recaptcha script loaded with locale', recaptchaLocale);
      const grecaptcha = (window as any).grecaptcha;
      if (grecaptcha && typeof grecaptcha.ready === 'function') {
        try {
          grecaptcha.ready(() => {
            renderRecaptcha();
          });
        } catch (err) {
          console.warn('grecaptcha.ready threw, calling renderRecaptcha directly', err);
          renderRecaptcha();
        }
      } else {
        renderRecaptcha();
      }
    };

    script.onerror = (error) => {
      console.error('recaptcha script failed to load', error);
      setError(t('loginModalRecaptchaLoadFailed'));
    };
    
    return () => {
      // Cleanup: remove the script if component unmounts or language changes
      script.remove();
      if ((window as any).grecaptcha) {
        delete (window as any).grecaptcha;
      }
      if ((window as any).___grecaptcha_cfg) {
        delete (window as any).___grecaptcha_cfg;
      }
    };
  }, [RECAPTCHA_SITE_KEY, recaptchaLocale, recaptchaWidgetId, t]);

  if (!isOpen) return null;

  const showRegistrationSuccess = Boolean(success && registrationSuccess);
  const title = showRegistrationSuccess
    ? t('loginModalVerificationSent')
    : isForgotPassword
      ? t('loginModalResetPasswordTitle')
      : isLogin
        ? t('loginModalSignIn')
        : t('loginModalSignUp');
  const subtitle = showRegistrationSuccess
    ? t('loginModalVerificationSentDesc')
    : isForgotPassword
      ? t('loginModalResetPasswordSubtitle')
      : isLogin
        ? t('loginModalAccessYourMigrationAssistant')
        : t('loginModalJoinUsToGetStarted');

  return (
    // When registration just succeeded we render a minimal modal with only the success message
    showRegistrationSuccess ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 animate-in fade-in zoom-in duration-300">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 mt-2">{t('loginModalVerificationSentDesc')}</p>
          </div>
          <div className="flex flex-col items-center gap-4 p-4">
            <CheckCircle2 size={48} className="text-emerald-600" />
            <p className="text-emerald-600 text-sm font-bold text-center">{success}</p>
            <p className="text-sm text-slate-400 mt-2 text-center">{t('loginModalVerificationSentDesc')}</p>
            {/* Button intentionally removed: show only message after registration until email verification */}
          </div>
        </div>
      </div>
    ) : (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
        </div>

        {!showRegistrationSuccess && !isForgotPassword && (
          <div className="mb-6">
            <GoogleSignInButton
              width={352}
              onAuthenticated={handleGoogleAuthenticated}
              onError={handleGoogleError}
            />
            <div className="mt-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('loginOr')}</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isForgotPassword && success ? (
            <div className="flex flex-col items-center gap-4 p-4">
              <CheckCircle2 size={48} className="text-emerald-600" />
              <p className="text-emerald-600 text-sm font-bold text-center">{success}</p>
              <p className="text-sm text-slate-400 mt-2">{t('loginModalRedirectingIn', { seconds: countdown })}</p>
            </div>
          ) : showRegistrationSuccess ? (
            <div className="flex flex-col items-center gap-4 p-4">
              <CheckCircle2 size={48} className="text-emerald-600" />
              <p className="text-emerald-600 text-sm font-bold text-center">{success}</p>
              <p className="text-sm text-slate-400 mt-2 text-center">{t('loginModalVerificationSentDesc')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">{t('loginModalEmailLabel')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      placeholder={t('loginModalEmailPlaceholder')}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {!isForgotPassword && !isLogin && (
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">{t('loginModalUsername')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder={t('loginModalUsernamePlaceholder')}
                        className="w-full pl-4 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!isForgotPassword && (
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">{t('loginModalPasswordLabel')}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder={t('loginModalPasswordPlaceholder')}
                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {!isForgotPassword && !isLogin && (
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-2 block">{t('loginModalConfirmPasswordLabel')}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder={t('loginModalPasswordPlaceholder')}
                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--spectrum-blue)] outline-none dark:text-white transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-xs font-bold text-center animate-shake">{error}</p>}

              {RECAPTCHA_SITE_KEY ? (
                <div className="flex justify-center" id="recaptcha-container" />
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  {t('loginModalRecaptchaNotConfigured')}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[var(--spectrum-blue)] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : isForgotPassword ? (
                  t('loginModalSendLink')
                ) : isLogin ? (
                  t('loginModalSignIn')
                ) : (
                  t('loginModalSignUp')
                )}
              </button>
            </>
          )}
        </form>

        {!showRegistrationSuccess && (
          <div className="mt-6 text-center">
            {isLogin && !isForgotPassword ? (
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  resetFeedback();
                }}
                type="button"
                className="mb-3 text-sm font-bold text-[var(--spectrum-blue)] hover:underline"
              >
                {t('forgotPassword')}
              </button>
            ) : isForgotPassword ? (
              <button
                type="button"
                onClick={resetToLogin}
                className="mb-3 text-sm font-bold text-[var(--spectrum-blue)] hover:underline"
              >
                {t('loginModalBackToLogin')}
              </button>
            ) : null}

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isLogin ? t('loginModalDontHaveAccount') : t('loginModalAlreadyHaveAccount')}
              <button
                onClick={toggleMode}
                type="button"
                className="ml-1.5 font-bold text-[var(--spectrum-blue)] hover:underline"
              >
                {isLogin ? t('loginModalCreateAccount') : t('loginModalSignIn')}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
    )
  );
};

export default LoginModal;
