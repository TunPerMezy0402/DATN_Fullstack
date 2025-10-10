// src/hooks/useGoogleAuth.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { googleAuthService } from '../services/authService';
import { AuthResponse } from '../api/authApi';

// ======================= TYPES =======================

interface GoogleAuthConfig {
  onSuccess?: (response: AuthResponse | { message: string }) => void;
  onError?: (error: Error) => void;
  isRegister?: boolean;
  autoLoad?: boolean;
}

interface GoogleAccount {
  id: {
    initialize: (config: GoogleInitConfig) => void;
    renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
    prompt: (callback?: (notification: any) => void) => void;
  };
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: any) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
}

interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccount;
    };
  }
}

// ======================= CONSTANTS =======================

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const SCRIPT_LOAD_TIMEOUT = 10000; // 10 seconds

// ======================= HOOK =======================

export const useGoogleAuth = (config: GoogleAuthConfig = {}) => {
  const { onSuccess, onError, isRegister = false, autoLoad = true } = config;

  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const initializationAttempted = useRef(false);

  // ======================= GOOGLE RESPONSE HANDLER =======================

  const handleGoogleResponse = useCallback(
    async (response: any) => {
      if (!response.credential) {
        const error = new Error('Không nhận được thông tin từ Google');
        onError?.(error);
        return;
      }

      setIsLoading(true);
      try {
        const credential = response.credential;
        const authResponse = isRegister
          ? await googleAuthService.register(credential)
          : await googleAuthService.login(credential);

        console.log(
          `✅ Google ${isRegister ? 'register' : 'login'} successful:`,
          authResponse
        );

        onSuccess?.(authResponse);
      } catch (error: any) {
        console.error(
          `❌ Google ${isRegister ? 'register' : 'login'} error:`,
          error
        );
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [isRegister, onSuccess, onError]
  );

  // ======================= INITIALIZE GOOGLE =======================

  const initializeGoogle = useCallback(async (): Promise<boolean> => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID is not configured');
      onError?.(new Error('Google Client ID chưa được cấu hình'));
      return false;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        });
        setIsGoogleLoaded(true);
        console.log('✅ Google OAuth initialized');
        return true;
      } catch (error) {
        console.error('Error initializing Google:', error);
        onError?.(new Error('Không thể khởi tạo Google OAuth'));
        return false;
      }
    }

    return false;
  }, [handleGoogleResponse, onError]);

  // ======================= LOAD GOOGLE SCRIPT =======================

  const loadGoogleScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const existingScript = document.querySelector(
        `script[src="${GOOGLE_SCRIPT_URL}"]`
      );

      if (existingScript) {
        if (window.google?.accounts?.id) {
          resolve(true);
        } else {
          existingScript.addEventListener('load', () => resolve(true));
          existingScript.addEventListener('error', () => resolve(false));
        }
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;

      const timeout = setTimeout(() => {
        console.error('Google script load timeout');
        resolve(false);
      }, SCRIPT_LOAD_TIMEOUT);

      script.onload = () => {
        clearTimeout(timeout);
        scriptRef.current = script;
        resolve(true);
      };

      script.onerror = () => {
        clearTimeout(timeout);
        console.error('Error loading Google script');
        resolve(false);
      };

      document.body.appendChild(script);
    });
  }, []);

  // ======================= AUTO LOAD EFFECT =======================

  useEffect(() => {
    if (!autoLoad || initializationAttempted.current) return;
    initializationAttempted.current = true;

    const initialize = async () => {
      const scriptLoaded = await loadGoogleScript();
      if (scriptLoaded) {
        setTimeout(() => {
          initializeGoogle();
        }, 200);
      } else {
        onError?.(new Error('Không thể tải Google OAuth script'));
      }
    };

    initialize();

    // Cleanup
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [autoLoad, loadGoogleScript, initializeGoogle, onError]);

  // ======================= TRIGGER GOOGLE AUTH =======================

  const handleGoogleAuth = useCallback(async () => {
    if (!isGoogleLoaded) {
      const initialized = await initializeGoogle();
      if (!initialized) {
        onError?.(new Error('Google OAuth chưa sẵn sàng'));
        return;
      }
    }

    if (!window.google?.accounts?.id) {
      onError?.(new Error('Google OAuth chưa được tải'));
      return;
    }

    try {
      // KHÔNG truyền callback để tránh warning về deprecated methods
      // Google One Tap sẽ tự động xử lý và gọi callback chính
      window.google.accounts.id.prompt();
    } catch (error: any) {
      // Suppress FedCM errors - user vẫn có thể dùng nút Google button
      if (error?.message?.includes('FedCM') || error?.message?.includes('CORS')) {
        console.warn('⚠️ FedCM/CORS issue detected. Google button vẫn hoạt động bình thường.');
      } else {
        console.error('Error triggering Google prompt:', error);
      }
      // Không throw error để không làm gián đoạn UX
    }
  }, [isGoogleLoaded, initializeGoogle, onError]);

  // ======================= RENDER GOOGLE BUTTON =======================

  const renderGoogleButton = useCallback(
    (elementId: string, buttonConfig?: GoogleButtonConfig) => {
      if (!isGoogleLoaded || !window.google?.accounts?.id) {
        console.warn('⚠️ Google chưa sẵn sàng để render nút');
        return false;
      }

      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`❌ Không tìm thấy phần tử với id "${elementId}"`);
        return false;
      }

      try {
        window.google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'large',
          text: isRegister ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          ...buttonConfig,
        });
        console.log('✅ Google button rendered');
        return true;
      } catch (error) {
        console.error('Error rendering Google button:', error);
        return false;
      }
    },
    [isGoogleLoaded, isRegister]
  );

  // ======================= RETURN =======================

  return {
    isGoogleLoaded,
    isLoading,
    initializeGoogle,
    handleGoogleAuth,
    renderGoogleButton,
  };
};

export default useGoogleAuth;