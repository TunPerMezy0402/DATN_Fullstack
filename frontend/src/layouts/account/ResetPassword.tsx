import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import '../../assets/admin/css/Account.css';

// ======================= TYPES =======================

interface FormErrors {
  password: string;
  confirmPassword: string;
  general: string;
}

// ======================= VALIDATION HELPERS =======================

const validators = {
  password: (password: string): boolean => {
    return password.length >= 6;
  },

  confirmPassword: (password: string, confirmPassword: string): boolean => {
    return password === confirmPassword;
  },

  validateForm: (
    password: string,
    confirmPassword: string
  ): { isValid: boolean; errors: FormErrors } => {
    const errors: FormErrors = {
      password: '',
      confirmPassword: '',
      general: '',
    };

    if (!password.trim()) {
      errors.password = 'Mật khẩu không được để trống';
    } else if (!validators.password(password)) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (!validators.confirmPassword(password, confirmPassword)) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    const isValid = !Object.values(errors).some((error) => error !== '');
    return { isValid, errors };
  },
};

// ======================= COMPONENT =======================

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Lấy token và email từ URL
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({
    password: '',
    confirmPassword: '',
    general: '',
  });

  // ======================= EFFECTS =======================

  useEffect(() => {
    // Kiểm tra token và email có tồn tại không
    if (!token || !email) {
      setErrors((prev) => ({
        ...prev,
        general: 'Link reset password không hợp lệ. Vui lòng yêu cầu link mới.',
      }));
    }
  }, [token, email]);

  // ======================= FORM HANDLERS =======================

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  const clearAllErrors = () => {
    setErrors({
      password: '',
      confirmPassword: '',
      general: '',
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Kiểm tra token và email
    if (!token || !email) {
      setErrors((prev) => ({
        ...prev,
        general: 'Link reset password không hợp lệ.',
      }));
      return;
    }

    clearAllErrors();

    // Validate form
    const { isValid, errors: validationErrors } = validators.validateForm(
      password,
      confirmPassword
    );

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(token, password);

      console.log('Reset password successful:', response);

      setSuccess(true);
      setErrors((prev) => ({
        ...prev,
        general: response.message || 'Đặt lại mật khẩu thành công!',
      }));

      // Chuyển về trang login sau 2 giây
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Đặt lại mật khẩu thất bại! Vui lòng thử lại.',
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
      <div className="auth-container reset-password-bg">
        {/* Animated Background Blobs */}
        <div className="auth-blob auth-blob-1"></div>
        <div className="auth-blob auth-blob-2"></div>
        <div className="auth-blob auth-blob-3"></div>

        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <h2 className="auth-title">Đặt lại mật khẩu</h2>
            <p className="auth-subtitle">
              Nhập mật khẩu mới của bạn để hoàn tất việc đặt lại
            </p>
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* General Message */}
            {errors.general && (
              <div
                className={`alert ${
                  errors.general.includes('thành công')
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

            {/* Email Display (Read-only) */}
            {email && (
              <div className="form-group">
                <label className="form-label">Email</label>
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
                    type="email"
                    className="form-input"
                    value={email}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="password-input">
                Mật khẩu mới
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
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading || success || !token || !email}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || success}
                  tabIndex={-1}
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
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading || success || !token || !email}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading || success}
                  tabIndex={-1}
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

            {/* Submit Button */}
            <button
              type="submit"
              className={`btn-submit btn-reset-password ${loading ? 'loading' : ''} ${
                success ? 'success' : ''
              }`}
              disabled={loading || success || !token || !email}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Đang xử lý...
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
                  Thành công! Đang chuyển hướng...
                </>
              ) : (
                'Đặt lại mật khẩu'
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

export default ResetPassword;