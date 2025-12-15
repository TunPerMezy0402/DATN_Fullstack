// src/layouts/client/pages/Register.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
// import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import '../../assets/admin/css/Account.css';


// ======================= TYPES =======================

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: string;
  general: string;
}

// ======================= VALIDATION HELPERS =======================

const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validateForm: (
    formData: FormData,
    agreedToTerms: boolean
  ): { isValid: boolean; errors: FormErrors } => {
    const errors: FormErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: '',
      general: '',
    };

    // Validate name
    if (!formData.name.trim()) {
      errors.name = 'Họ và tên không được để trống';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Họ và tên phải có ít nhất 2 ký tự';
    }

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

    // Validate confirm password
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    // Validate terms
    if (!agreedToTerms) {
      errors.terms = 'Vui lòng đồng ý với điều khoản dịch vụ';
    }

    const isValid = !Object.values(errors).some((error) => error !== '');
    return { isValid, errors };
  },
};

// ======================= COMPONENT =======================

const Register: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: '',
    general: '',
  });

  const navigate = useNavigate();

  // ======================= GOOGLE AUTH HOOK =======================
  // Tạm thời không dùng Google Register để tránh xung đột type; có thể bật lại sau


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
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: '',
      general: '',
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    clearAllErrors();

    // Validate form
    const { isValid, errors: validationErrors } = validators.validateForm(
      formData,
      agreedToTerms
    );

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });

      console.log('Register successful:', response);

      // Show success message and redirect to login
      setErrors((prev) => ({
        ...prev,
        general: response.message || 'Đăng ký thành công! Đang chuyển hướng...',
      }));

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Register error:', error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Đăng ký thất bại! Vui lòng thử lại.',
      }));
    } finally {
      setLoading(false);
    }
  };

  // const handleGoogleRegister = async () => {};

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  // ======================= RENDER =======================

  return (
    <>
      <Header />
      <div className="auth-container register-bg">
        {/* Animated Background Blobs */}
        <div className="auth-blob auth-blob-1"></div>
        <div className="auth-blob auth-blob-2"></div>
        <div className="auth-blob auth-blob-3"></div>

        <div className="auth-card">
          {/* Header */}
          <div className="auth-header register-header">
            <h2 className="auth-title">Đăng ký</h2>
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* General Message */}
            {errors.general && (
              <div className={`alert ${errors.general.includes('thành công') ? 'alert-success' : 'alert-error'}`}>
                <svg
                  className="alert-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {errors.general.includes('thành công') ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
                <span>{errors.general}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="name-input">
                Họ và tên
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <input
                  id="name-input"
                  type="text"
                  className={`form-input ${errors.name ? 'input-error' : ''}`}
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

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
                  autoComplete="new-password"
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

            {/* Confirm Password Input */}
            <div className="form-group">
              <label
                className="form-label form-label-required"
                htmlFor="confirm-password-input"
              >
                Xác nhận mật khẩu
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <input
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? (
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
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="terms-container">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  className="terms-checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (errors.terms) {
                      setErrors((prev) => ({ ...prev, terms: '' }));
                    }
                  }}
                  disabled={loading}
                />
                <span className="terms-text">
                  Tôi đồng ý với{' '}
                  <button type="button" className="terms-link">
                    Điều khoản dịch vụ
                  </button>{' '}
                  và{' '}
                  <button type="button" className="terms-link">
                    Chính sách bảo mật
                  </button>
                </span>
              </label>
              {errors.terms && <span className="error-message">{errors.terms}</span>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`btn-submit btn-register ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Đang xử lý...
                </>
              ) : (
                'Đăng ký'
              )}
            </button>

            {/* Login Link */}
            <p className="auth-footer-text">
              Đã có tài khoản?
              <button
                type="button"
                className="auth-link"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Đăng nhập ngay
              </button>
            </p>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};
export default Register;