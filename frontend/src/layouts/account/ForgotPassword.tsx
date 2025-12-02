// src/layouts/client/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../../services/authService';
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import '../../assets/admin/css/Account.css';

// Lưu ý: authApi.forgotPassword đã gọi endpoint /auth/forgot-password

// ======================= TYPES =======================

interface FormData {
  email: string;
}

interface FormErrors {
  email: string;
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
      general: '',
    };

    // Validate email
    if (!formData.email.trim()) {
      errors.email = 'Email không được để trống';
    } else if (!validators.email(formData.email)) {
      errors.email = 'Email không hợp lệ';
    }

    const isValid = !Object.values(errors).some((error) => error !== '');
    return { isValid, errors };
  },
};

// ======================= COMPONENT =======================

const ForgotPassword: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({
    email: '',
    general: '',
  });

  const navigate = useNavigate();

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
      const response = await authApi.forgotPassword(formData.email);

      console.log('Forgot password request successful:', response);

      setEmailSent(true);
      setErrors((prev) => ({
        ...prev,
        general: response.message || 'Đã gửi email khôi phục mật khẩu!',
      }));
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Gửi yêu cầu thất bại! Vui lòng thử lại.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    handleSubmit();
  };

  // ======================= RENDER =======================

  return (
    <>
      <Header />
      <div className="auth-container forgot-password-bg">
        {/* Animated Background Blobs */}
        <div className="auth-blob auth-blob-1"></div>
        <div className="auth-blob auth-blob-2"></div>
        <div className="auth-blob auth-blob-3"></div>

        <div className="auth-card">
          {/* Header */}
          <div className="auth-header forgot-password-header">
            <h2 className="auth-title">Quên mật khẩu</h2>
            <p className="auth-subtitle">
              {emailSent
                ? 'Kiểm tra email của bạn'
                : 'Nhập email để nhận liên kết đặt lại mật khẩu'}
            </p>
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* General Message */}
            {errors.general && (
              <div
                className={`alert ${
                  errors.general.includes('thành công') || errors.general.includes('Đã gửi')
                    ? 'alert-success'
                    : 'alert-error'
                }`}
              >
                <svg
                  className="alert-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {errors.general.includes('thành công') || errors.general.includes('Đã gửi') ? (
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

            {/* Email Sent Success View */}
            {emailSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ color: '#10b981', marginBottom: '16px' }}>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width="64"
                    height="64"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
                  Chúng tôi đã gửi email đến <strong>{formData.email}</strong>. Vui lòng kiểm
                  tra hộp thư (bao gồm cả thư mục spam) và làm theo hướng dẫn để đặt lại mật
                  khẩu.
                </p>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleResendEmail}
                  disabled={loading}
                  style={{ background: 'transparent', border: '1px solid #d1d5db', color: '#374151' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Đang gửi lại...
                    </>
                  ) : (
                    'Gửi lại email'
                  )}
                </button>
              </div>
            ) : (
              <>
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
                      autoFocus
                    />
                  </div>
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`btn-submit btn-forgot-password ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Gửi liên kết đặt lại'
                  )}
                </button>
              </>
            )}

            {/* Back to Login Link */}
            <p className="auth-footer-text">
              <button
                type="button"
                className="auth-link"
                onClick={() => navigate('/login')}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Quay lại đăng nhập
              </button>
            </p>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ForgotPassword;