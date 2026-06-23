import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
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

let googleScriptPromise: Promise<void> | null = null;

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]'
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Google script failed to load.')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      // Force English label for the rendered button
      script.src = 'https://accounts.google.com/gsi/client?hl=en';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google script failed to load.'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
};

const getGoogleAuthErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
  return response?.data?.error || response?.data?.message || 'Google authentication failed.';
};

const GoogleSignInButton = ({
  onAuthenticated,
  onError,
  theme = 'outline',
  width = 340,
}: GoogleSignInButtonProps) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let isMounted = true;

    if (!clientId) {
      return;
    }

    loadGoogleScript()
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
                onError?.('Google did not return a valid credential.');
                return;
              }

              setIsAuthenticating(true);
              try {
                const data = await authService.googleLogin(response.credential);
                onAuthenticated(data);
              } catch (error) {
                onError?.(getGoogleAuthErrorMessage(error));
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
          setScriptError('Google sign-in is unavailable.');
        }
      });

    return () => {
      isMounted = false;
      window.google?.accounts?.id.cancel();
    };
  }, [clientId, onAuthenticated, onError, theme, width]);

  const configError = clientId ? scriptError : 'Google sign-in is not configured.';

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
