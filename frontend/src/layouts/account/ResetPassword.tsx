// src/layouts/account/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authApi from '../../services/authService';
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import '../../assets/admin/css/Account.css';

// ======================= TYPES =======================

interface FormData {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password: string;
  confirmPassword: string;
  general: string;
}

// ======================= VALIDATION HELPERS =======================

const validators = {
  validateForm: (formData: FormData): { isValid: boolean; errors: FormErrors } => {
    const errors: FormErrors = {
      password: '',
      confirmPassword: '',
      general: '',
    };

    if (!formData.password.trim()) {
      errors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    const isValid = !Object.values(errors).some((error) => error !== '');
    return { isValid, errors };
  },
};

// ======================= COMPONENT =======================

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({
    password: '',
    confirmPassword: '',
    general: '',
  });

  // ======================= CHECK PARAMS ON MOUNT =======================

  useEffect(() => {
    if (!token || !email) {
      setTokenValid(false);
      setErrors((prev) => ({
        ...prev,
        general: 'Link đặt lại mật khẩu không hợp lệ.',
      }));
    }
  }, [token, email]);

  // ======================= FORM HANDLERS =======================

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const clearAllErrors = () => {
    setErrors({ password: '', confirmPassword: '', general: '' });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    clearAllErrors();

    const { isValid, errors: validationErrors } = validators.validateForm(formData);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, formData.password);

      setResetSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      // Kiểm tra nếu token hết hạn
      if (error.message?.includes('hết hạn') || error.message?.includes('không hợp lệ')) {
        setTokenValid(false);
      }
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Đặt lại mật khẩu thất bại! Vui lòng thử lại.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
  };

  // ======================= RENDER =======================

  // Invalid token
  if (!tokenValid) {
    return (
      <>
        <Header />
        <div className="auth-container">
          <div className="auth-blob auth-blob-1"></div>
          <div className="auth-blob auth-blob-2"></div>
          <div className="auth-blob auth-blob-3"></div>
          <div className="auth-card">
            <div className="auth-header" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <svg fill="none" stroke="#ef4444" viewBox="0 0 24 24" width="64" height="64" style={{ marginBottom: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="auth-title">Link không hợp lệ</h2>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>{errors.general || 'Link đã hết hạn hoặc không hợp lệ.'}</p>
              <button className="btn-submit" onClick={() => navigate('/forgot-password')}>
                Yêu cầu link mới
              </button>
              <p className="auth-footer-text">
                <button type="button" className="auth-link" onClick={() => navigate('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Quay lại đăng nhập
                </button>
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Success
  if (resetSuccess) {
    return (
      <>
        <Header />
        <div className="auth-container">
          <div className="auth-blob auth-blob-1"></div>
          <div className="auth-blob auth-blob-2"></div>
          <div className="auth-blob auth-blob-3"></div>
          <div className="auth-card">
            <div className="auth-header" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <svg fill="none" stroke="#10b981" viewBox="0 0 24 24" width="64" height="64" style={{ marginBottom: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="auth-title">Đặt lại mật khẩu thành công!</h2>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>
                Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng đến trang đăng nhập...
              </p>
              <button className="btn-submit" onClick={() => navigate('/login')}>
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Main form
  return (
    <>
      <Header />
      <div className="auth-container">
        <div className="auth-blob auth-blob-1"></div>
        <div className="auth-blob auth-blob-2"></div>
        <div className="auth-blob auth-blob-3"></div>

        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">Đặt lại mật khẩu</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>
              Nhập mật khẩu mới cho tài khoản {email}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="alert alert-error">
                <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errors.general}</span>
              </div>
            )}

            {/* Password Input */}
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="password-input">
                Mật khẩu mới
              </label>
              <div className="input-container">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                  autoFocus
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {/* Confirm Password Input */}
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="confirm-password-input">
                Xác nhận mật khẩu mới
              </label>
              <div className="input-container">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
                >
                  {showConfirmPassword ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`btn-submit ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Đang xử lý...
                </>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>

            {/* Back to Login */}
            <p className="auth-footer-text">
              <button
                type="button"
                className="auth-link"
                onClick={() => navigate('/login')}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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