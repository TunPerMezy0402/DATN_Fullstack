// src/layouts/client/pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import '../../assets/admin/css/Account.css';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: '',
    general: ''
  });
  const navigate = useNavigate();

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form inputs
  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: '',
      general: ''
    };
    let isValid = true;

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Họ và tên không được để trống';
      isValid = false;
    } else if (name.trim().length < 2) {
      newErrors.name = 'Họ và tên phải có ít nhất 2 ký tự';
      isValid = false;
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email không được để trống';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    // Validate password
    if (!password.trim()) {
      newErrors.password = 'Mật khẩu không được để trống';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
      isValid = false;
    }

    // Validate terms
    if (!agreedToTerms) {
      newErrors.terms = 'Vui lòng đồng ý với điều khoản dịch vụ';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Clear previous errors
    setErrors({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: '',
      general: ''
    });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call API to register
      const response = await authService.register({
        name,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      console.log('Register successful:', response);

      // Navigate to dashboard based on user role
      const userRole = response.user.role;
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Register error:', error);

      // Xử lý lỗi từ backend
      const errorMessage = error.message || 'Đăng ký thất bại! Vui lòng thử lại.';

      // Hiển thị lỗi chung
      setErrors({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        terms: '',
        general: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    console.log('Google register clicked');
    alert('Chức năng đăng ký Google đang được phát triển');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <div className="auth-container register-bg">
      {/* Animated Background Blobs */}
      <div className="auth-blob auth-blob-1"></div>
      <div className="auth-blob auth-blob-2"></div>
      <div className="auth-blob auth-blob-3"></div>

      <div className="auth-card">
        {/* Header */}
        <div className="auth-header register-header">
          <div className="auth-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="auth-title">Tạo tài khoản mới</h2>
          <p className="auth-subtitle">Đăng ký để bắt đầu hành trình của bạn</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                id="name-input"
                type="text"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                id="email-input"
                type="email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="example@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
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
              Xác nhận mật khẩu
            </label>
            <div className="input-container">
              <svg 
                className="input-icon" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <input
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
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

          {/* Terms Checkbox */}
          <div className="terms-container">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                className="terms-checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (errors.terms) setErrors({ ...errors, terms: '' });
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

          {/* Divider */}
          <div className="divider">
            <span className="divider-text">Hoặc đăng ký với</span>
          </div>

          {/* Google Register Button */}
          <button
            type="button"
            className="btn-google"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Đăng ký với Google</span>
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
  );
};

export default Register;