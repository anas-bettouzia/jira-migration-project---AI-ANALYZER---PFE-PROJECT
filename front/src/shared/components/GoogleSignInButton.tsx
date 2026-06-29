import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useI18n } from '../../i18n';
import type { AuthResponse } from '../types/auth';

type GoogleButtonTheme = 'outline' | 'filled_blue' | 'filled_black';

interface GoogleSignInButtonProps {
  onAuthenticated: (data: AuthResponse) => void;
  onError?: (message: string) => void;
  theme?: GoogleButtonTheme;
  width?: number;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme: GoogleButtonTheme;
          size: 'large';
          type: 'standard';
          shape: 'rectangular';
          text: 'continue_with';
          logo_alignment: 'left';
          width: number;
        }
      ) => void;
      cancel: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

// Map pour suivre le chargement du script par langue
const googleScriptsLoaded: Record<string, Promise<void>> = {};

const loadGoogleScript = (lang: string) => {
  if (window.google?.accounts?.id && document.querySelector(`script[src*="hl=${lang}"]`)) {
    return Promise.resolve();
  }

  if (!googleScriptsLoaded[lang]) {
    googleScriptsLoaded[lang] = new Promise((resolve, reject) => {
      // Supprimer l'ancien script d'une autre langue s'il existe pour éviter les conflits
      const oldScript = document.querySelector('script[src^="https://accounts.google.com/gsi/client"]');
      if (oldScript) {
        oldScript.remove();
        // On réinitialise l'objet global pour forcer Google à se recharger avec la bonne langue
        if (window.google) {
          delete (window as any).google;
        }
      }

      const script = document.createElement('script');
      // Modification ici : injection dynamique de la langue active ({lang})
      script.src = `https://accounts.google.com/gsi/client?hl=${lang}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google script failed to load.'));
      document.head.appendChild(script);
    });
  }

  return googleScriptsLoaded[lang];
};

const getGoogleAuthErrorMessage = (error: unknown, fallbackMessage: string) => {
  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || fallbackMessage;
};

const GoogleSignInButton = ({
  onAuthenticated,
  onError,
  theme = 'outline',
  width = 340,
}: GoogleSignInButtonProps) => {
  // Récupération de la langue actuelle ('en' ou 'fr') depuis votre contexte i18n
  const { t, language } = useI18n();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let isMounted = true;

    if (!clientId) {
      return;
    }

    // On passe le paramètre 'language' à la fonction de chargement
    loadGoogleScript(language)
      .then(() => {
        if (!isMounted || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        buttonRef.current.innerHTML = '';
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              if (!response.credential) {
                onError?.(t('auth.googleNoCredential'));
                return;
              }

              setIsAuthenticating(true);
              try {
                const data = await authService.googleLogin(response.credential);
                onAuthenticated(data);
              } catch (error) {
                onError?.(getGoogleAuthErrorMessage(error, t('auth.googleAuthFailed')));
              } finally {
                if (isMounted) {
                  setIsAuthenticating(false);
                }
              }
            },
          });

          window.google.accounts.id.renderButton(buttonRef.current, {
            theme,
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width,
          });
        } catch (error) {
          console.error('Google sign-in initialization error:', error);
          if (isMounted) {
            setScriptError(
              `Google sign-in failed to initialize for origin ${window.location.origin}. ` +
              'Check your OAuth client ID and add this origin to the authorized JavaScript origins.'
            );
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setScriptError(t('auth.googleUnavailable'));
        }
      });

    return () => {
      isMounted = false;
      window.google?.accounts?.id.cancel();
    };
    // Ajout de 'language' dans les dépendances pour recharger le bouton au changement de langue
  }, [clientId, onAuthenticated, onError, theme, width, language, t]);

  const configError = clientId ? scriptError : t('auth.googleNotConfigured');

  if (configError) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        {configError}
      </p>
    );
  }

  return (
    <div className="relative flex min-h-[44px] justify-center">
      <div ref={buttonRef} />
      {isAuthenticating && (
        <div className="absolute inset-0 flex items-center justify-center rounded border border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
          <Loader2 className="animate-spin text-[var(--spectrum-blue)]" size={18} />
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;