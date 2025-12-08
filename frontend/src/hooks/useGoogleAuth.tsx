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
    cancel: () => void;
    disableAutoSelect?: () => void;
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
          console.log('✅ Google login thành công');
        } catch (loginError: any) {
          console.log('⚠️ Chưa có tài khoản, thử đăng ký...');
          // Nếu login thất bại do chưa có tài khoản, thử đăng ký
          try {
            const registerRes = await googleAuthService.register(credential);
            if (registerRes && (registerRes as any).message) {
              // Sau khi đăng ký thành công mới login và lưu
              authResponse = await googleAuthService.login(credential);
              console.log('✅ Google register + login thành công');
            }
          } catch (registerError: any) {
            // Không đăng ký được: đảm bảo không lưu bất cứ dữ liệu nào
            console.error('❌ Google register thất bại');
            try {
              googleAuthService && (authService as any)?.clearAuth?.();
            } catch {}
            throw registerError;
          }
        }

        onSuccess?.(authResponse);
      } catch (error: any) {
        console.error('❌ Lỗi Google auth:', error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // ======================= KHỞI TẠO GOOGLE =======================

  const initializeGoogle = useCallback(async (): Promise<boolean> => {
    if (!GOOGLE_CLIENT_ID) {
      if (!clientIdErrorNotified.current) {
        clientIdErrorNotified.current = true;
        console.error('❌ Chưa cấu hình Google Client ID');
        onError?.(new Error('Google Client ID chưa được cấu hình'));
      }
      return false;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false, // ✅ TẮT auto select
          cancel_on_tap_outside: true,
          itp_support: true,
          context: 'signin',
          use_fedcm_for_prompt: false, // ✅ TẮT FedCM prompt
        });

        // ✅ Force disable auto-select và cancel mọi prompt
        try {
          (window.google.accounts.id as any).disableAutoSelect?.();
          window.google.accounts.id.cancel(); // ✅ Hủy mọi prompt tự động
        } catch (e) {
          console.warn('Không thể disable auto-select:', e);
        }

        setIsGoogleLoaded(true);
        console.log('✅ Google OAuth đã được khởi tạo (không auto-prompt)');
        return true;
      } catch (error) {
        console.error('❌ Lỗi khi khởi tạo Google:', error);
        onError?.(new Error('Không thể khởi tạo Google OAuth'));
        return false;
      }
    }

    return false;
  }, [handleGoogleResponse, onError]);

  // ======================= HỦY GOOGLE ONE TAP =======================

  const cancelGooglePrompt = useCallback(() => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.cancel();
        console.log('✅ Đã hủy Google One Tap prompt');
      } catch (error) {
        console.warn('⚠️ Không thể hủy Google One Tap:', error);
      }
    }
  }, []);

  // ======================= HIỂN THỊ NÚT GOOGLE =======================

  const renderGoogleButton = useCallback(
    (elementId: string, buttonConfig?: GoogleButtonConfig) => {
      if (!isGoogleLoaded || !window.google?.accounts?.id) {
        console.warn('⚠️ Google chưa được tải');
        return false;
      }

      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`❌ Không tìm thấy phần tử với id "${elementId}"`);
        return false;
      }

      try {
        // ✅ Đảm bảo không có auto-select trước khi render
        try {
          (window.google.accounts.id as any).disableAutoSelect?.();
        } catch {}

        window.google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'large',
          text: isRegister ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          locale: 'vi',
          personalization: 'off',
          context: isRegister ? 'signup' : 'signin',
          ...buttonConfig,
        });

        console.log('✅ Nút Google đã được hiển thị');
        return true;
      } catch (error) {
        console.error('❌ Lỗi khi hiển thị nút Google:', error);
        return false;
      }
    },
    [isGoogleLoaded, isRegister]
  );

  // ======================= TẢI SCRIPT GOOGLE =======================

  const loadGoogleScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // Kiểm tra script đã tồn tại chưa
      const existedScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
      
      if (existedScript) {
        if (window.google?.accounts?.id) {
          resolve(true);
        } else {
          existedScript.addEventListener('load', () => resolve(true));
          existedScript.addEventListener('error', () => resolve(false));
        }
        return;
      }

      // Tạo script mới
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        scriptRef.current = script;
        console.log('✅ Google SDK đã được tải');
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('❌ Không thể tải Google SDK');
        resolve(false);
      };
      
      document.body.appendChild(script);
    });
  }, []);

  // ======================= TỰ ĐỘNG TẢI SCRIPT KHI MOUNT =======================

  useEffect(() => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    const initialize = async () => {
      const scriptLoaded = await loadGoogleScript();
      
      if (scriptLoaded) {
        await initializeGoogle();
      } else {
        onError?.(new Error('Không thể tải Google SDK'));
      }
    };

    initialize();

    // Cleanup khi unmount
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
    renderGoogleButton,
    cancelGooglePrompt, // ✅ Export method cancel
  };
};

export default useGoogleAuth;