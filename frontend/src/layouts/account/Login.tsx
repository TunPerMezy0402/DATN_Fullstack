// src/layouts/client/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import '../../assets/admin/css/Account.css';

// ======================= TYPES =======================

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email: string;
  password: string;
  general: string;
}

// ======================= VALIDATION HELPERS =======================

const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validateForm: (formData: FormData): { isValid: boolean; errors: FormErrors } => {
    const errors: FormErrors = {
      email: '',
      password: '',
      general: '',
    };

    // Validate email
    if (!formData.email.trim()) {
      errors.email = 'Email không được để trống';
    } else if (!validators.email(formData.email)) {
      errors.email = 'Email không hợp lệ';
    }

    // Validate password
    if (!formData.password.trim()) {
      errors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    const isValid = !Object.values(errors).some((error) => error !== '');
    return { isValid, errors };
  },
};

// ======================= COMPONENT =======================

const Login: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({
    email: '',
    password: '',
    general: '',
  });

  const navigate = useNavigate();

  // ======================= LOAD REMEMBERED EMAIL =======================

  useEffect(() => {
    const rememberedEmail = authService.getRememberedEmail();
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  // ======================= GOOGLE AUTH HOOK =======================
  const { isGoogleLoaded, renderGoogleButton } = useGoogleAuth({
    onSuccess: (response) => {
      if ('user' in response && response.user && response.user.role) {
        const userRole = response.user.role;
        navigate(userRole === 'admin' ? '/admin/dashboard' : '/');
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Đăng nhập với Google thất bại! Vui lòng thử lại.',
      }));
    },
    isRegister: false,
  });

  // ======================= FORM HANDLERS =======================

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const clearAllErrors = () => {
    setErrors({
      email: '',
      password: '',
      general: '',
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    clearAllErrors();

    // Validate form
    const { isValid, errors: validationErrors } = validators.validateForm(formData);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      // Call API to login
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      // Save or clear remembered email
      if (rememberMe) {
        authService.saveRememberedEmail(formData.email);
      } else {
        authService.clearRememberedEmail();
      }

      console.log('Login successful:', response);

      // Navigate to dashboard based on user role
      const userRole = response.user.role;
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Đăng nhập thất bại! Vui lòng thử lại.',
      }));
    } finally {
      setLoading(false);
    }
  };

  // Removed manual trigger to avoid unused warnings; SDK button handles auth

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  // ======================= RENDER =======================

  return (
    <div className="auth-container login-bg">
      {/* Animated Background Blobs */}
      <div className="auth-blob auth-blob-1"></div>
      <div className="auth-blob auth-blob-2"></div>
      <div className="auth-blob auth-blob-3"></div>

      <div className="auth-card">
        {/* Header */}
        <div className="auth-header login-header">
          <div className="auth-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="auth-title">Chào mừng trở lại</h2>
          <p className="auth-subtitle">Đăng nhập để tiếp tục với tài khoản của bạn</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* General Error Message */}
          {errors.general && (
            <div className="alert alert-error">
              <svg
                className="alert-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errors.general}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="email-input">
              Email
            </label>
            <div className="input-container">
              <svg
                className="input-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <input
                id="email-input"
                type="email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="password-input">
              Mật khẩu
            </label>
            <div className="input-container">
              <svg
                className="input-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* Remember & Forgot Password */}
          <div className="form-footer">
            <button
              type="button"
              className="forgot-link"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`btn-submit btn-login ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Đang xử lý...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>

          {/* Divider */}
          <div className="divider">
            <span className="divider-text">Hoặc đăng nhập với</span>
          </div>

          {/* Google Login Button (SDK renders here; không hiện tên/email) */}
          <div
            id="google-login-button"
            ref={(() => {
              // render khi SDK sẵn sàng
              if (isGoogleLoaded) {
                setTimeout(() => renderGoogleButton('google-login-button'), 0);
              }
              return undefined as unknown as React.RefObject<HTMLDivElement>;
            })()}
          ></div>

          {/* Register Link */}
          <p className="auth-footer-text">
            Chưa có tài khoản?
            <button
              type="button"
              className="auth-link"
              onClick={() => navigate('/register')}
              disabled={loading}
            >
              Đăng ký ngay
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;