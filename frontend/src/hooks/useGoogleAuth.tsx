import { useState, useEffect, useCallback, useRef } from 'react';
import authService, { googleAuthService } from '../services/authService';
import { AuthResponse } from '../api/authApi';

// ======================= KIỂU DỮ LIỆU =======================

interface GoogleAuthConfig {
  onSuccess?: (response: AuthResponse | { message: string }) => void;
  onError?: (error: Error) => void;
  isRegister?: boolean;
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
  context?: string;
  use_fedcm_for_prompt?: boolean;
}

interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
  personalization?: 'off' | 'auto';
  context?: 'signin' | 'signup' | 'use';
  click_listener?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccount;
    };
  }
}

// ======================= HẰNG SỐ =======================

// CRA env
const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID as string) || '';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// ======================= HOOK =======================

export const useGoogleAuth = (config: GoogleAuthConfig = {}) => {
  const { onSuccess, onError, isRegister = false } = config;

  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const initializationAttempted = useRef(false);
  const clientIdErrorNotified = useRef(false);

  // ======================= XỬ LÝ PHẢN HỒI GOOGLE =======================

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
        let authResponse: any | null = null;

        try {
          // Thử login trước
          authResponse = await googleAuthService.login(credential);
        } catch (loginError: any) {
          // Nếu login thất bại do chưa có tài khoản, thử đăng ký
          try {
            const registerRes = await googleAuthService.register(credential);
            if (registerRes && (registerRes as any).message) {
              // Sau khi đăng ký thành công mới login và lưu
              authResponse = await googleAuthService.login(credential);
            }
          } catch (registerError: any) {
            // Không đăng ký được: đảm bảo không lưu bất cứ dữ liệu nào
            console.warn('Google register failed, ensuring no local data is stored');
            try { googleAuthService && (authService as any)?.clearAuth?.(); } catch {}
            throw registerError;
          }
        }

        console.log('✅ Google auth thành công:', authResponse);
        onSuccess?.(authResponse);
      } catch (error: any) {
        console.error('❌ Lỗi Google auth:', error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [isRegister, onSuccess, onError]
  );

  // ======================= KHỞI TẠO GOOGLE =======================

  const initializeGoogle = useCallback(async (): Promise<boolean> => {
    if (!GOOGLE_CLIENT_ID) {
      if (!clientIdErrorNotified.current) {
        clientIdErrorNotified.current = true;
        console.error('Chưa cấu hình Google Client ID');
        onError?.(new Error('Google Client ID chưa được cấu hình'));
      }
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
          // Add context to help with COOP issues
          context: 'signin',
          // Disable popup blocking
          use_fedcm_for_prompt: false,
        });
        
        // Force disable auto-select
        try {
          (window.google.accounts.id as any).disableAutoSelect?.();
        } catch {}
        setIsGoogleLoaded(true);
        console.log('✅ Google OAuth đã được khởi tạo');
        return true;
      } catch (error) {
        console.error('Lỗi khi khởi tạo Google:', error);
        onError?.(new Error('Không thể khởi tạo Google OAuth'));
        return false;
      }
    }

    return false;
  }, [handleGoogleResponse, onError]);

  // ======================= KÍCH HOẠT GOOGLE AUTH =======================

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
      // Try to open popup first to check if it's allowed
      const popup = window.open('', '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes');
      if (popup) {
        popup.close();
      }
      
      // Now try the Google OAuth prompt
      window.google.accounts.id.prompt();
    } catch (error: any) {
      console.warn('Popup blocked, trying alternative method:', error);
      
      // Fallback: try to redirect to Google OAuth
      try {
        const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=openid%20email%20profile`;
        window.location.href = authUrl;
      } catch (fallbackError) {
        onError?.(new Error('Không thể mở cửa sổ đăng nhập Google. Vui lòng cho phép popup cho trang web này.'));
      }
    }
  }, [isGoogleLoaded, initializeGoogle, onError]);

  // ======================= HIỂN THỊ NÚT GOOGLE =======================

  const renderGoogleButton = useCallback(
    (elementId: string, buttonConfig?: GoogleButtonConfig) => {
      if (!isGoogleLoaded || !window.google?.accounts?.id) {
        return false;
      }

      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`❌ Không tìm thấy phần tử với id "${elementId}"`);
        return false;
      }

      try {
        try { (window.google.accounts.id as any).disableAutoSelect?.(); } catch {}
        window.google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          locale: 'vi',
          personalization: 'off',
          context: 'signin',
          // Add click handler to handle COOP issues
          click_listener: () => {
            // Ensure popup is allowed
            try {
              window.open('', '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes');
            } catch (e) {
              console.warn('Popup blocked, continuing with OAuth flow');
            }
          },
          ...buttonConfig,
        });
        console.log('✅ Nút Google đã được hiển thị');
        return true;
      } catch (error) {
        console.error('Lỗi khi hiển thị nút Google:', error);
        return false;
      }
    },
    [isGoogleLoaded, isRegister]
  );

  // ======================= TẢI SCRIPT GOOGLE =======================

  const loadGoogleScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const existed = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
      if (existed) {
        if (window.google?.accounts?.id) {
          resolve(true);
        } else {
          existed.addEventListener('load', () => resolve(true));
          existed.addEventListener('error', () => resolve(false));
        }
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptRef.current = script;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // Tự động tải script và khởi tạo khi mount
  useEffect(() => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    const run = async () => {
      const ok = await loadGoogleScript();
      if (ok) {
        await initializeGoogle();
      } else {
        onError?.(new Error('Không thể tải Google SDK'));
      }
    };

    run();

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [loadGoogleScript, initializeGoogle, onError]);

  // ======================= TRẢ VỀ =======================

  return {
    isGoogleLoaded,
    isLoading,
    initializeGoogle,
    handleGoogleAuth,
    renderGoogleButton,
  };
};

export default useGoogleAuth;
