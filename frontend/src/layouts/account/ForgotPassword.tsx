import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import '../../assets/admin/css/Account.css';

// ======================= TYPES =======================

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

  validateForm: (email: string): { isValid: boolean; errors: FormErrors } => {
    const errors: FormErrors = {
      email: '',
      general: '',
    };

    if (!email.trim()) {
      errors.email = 'Email không được để trống';
    } else if (!validators.email(email)) {
      errors.email = 'Email không hợp lệ';
    }

    const isValid = !Object.values(errors).some((error) => error !== '');
    return { isValid, errors };
  },
};

// ======================= COMPONENT =======================

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({
    email: '',
    general: '',
  });

  // ======================= FORM HANDLERS =======================

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Xóa error khi user nhập
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: '' }));
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
    const { isValid, errors: validationErrors } = validators.validateForm(email);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);

      console.log('Forgot password successful:', response);

      setSuccess(true);
      setErrors((prev) => ({
        ...prev,
        general: response.message || 'Đã gửi email reset password! Vui lòng kiểm tra hộp thư.',
      }));
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Gửi email thất bại! Vui lòng thử lại.',
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
          <div className="auth-header">
            <h2 className="auth-title">Quên mật khẩu?</h2>
            <p className="auth-subtitle">
              Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu
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
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading || success}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`btn-submit btn-forgot-password ${loading ? 'loading' : ''} ${
                success ? 'success' : ''
              }`}
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Đang gửi...
                </>
              ) : success ? (
                <>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    style={{ marginRight: '8px' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Đã gửi email
                </>
              ) : (
                'Gửi link reset password'
              )}
            </button>

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