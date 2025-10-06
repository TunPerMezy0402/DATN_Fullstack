import React, { useState, useEffect } from 'react';
import { useGoogleLogin  } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import axiosClient from '../../api/axiosClient';
import '../../assets/admin/css/Account.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const navigate = useNavigate();

  // Load remembered email nếu có
  useEffect(() => {
    const rememberedEmail = authService.getRememberedEmail();
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form inputs
  const validateForm = (): boolean => {
    const newErrors = { email: '', password: '', general: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email không được để trống';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = 'Mật khẩu không được để trống';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Clear previous errors
    setErrors({ email: '', password: '', general: '' });

    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Call API to login
      const response = await authService.login({ email, password });
      
      // Save or clear remembered email
      if (rememberMe) {
        authService.saveRememberedEmail(email);
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
      
      const errorMessage = error.message || 'Đăng nhập thất bại! Vui lòng thử lại.';
      
      setErrors({ 
        email: '', 
        password: '', 
        general: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

const googleLogin = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    try {
      setLoading(true);
      console.log("Google token:", tokenResponse.access_token);

      // Gửi token Google lên backend để xác thực
      const response = await authService.loginWithGoogle(tokenResponse.access_token);

      console.log("Google login success:", response);

      // Lưu thông tin và chuyển hướng
      authService.saveAuth(response);

      const userRole = response.user.role;
      if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      setErrors({
        email: "",
        password: "",
        general: "Đăng nhập Google thất bại. Vui lòng thử lại.",
      });
    } finally {
      setLoading(false);
    }
  },
  onError: (errorResponse) => {
    console.error("Google OAuth error:", errorResponse);
    setErrors({
      email: "",
      password: "",
      general: "Không thể kết nối Google. Vui lòng thử lại.",
    });
  },
});

// Khi bấm nút "Đăng nhập với Google"
const handleGoogleLogin = () => {
  googleLogin(); // Gọi Google OAuth popup
};

// --- Forgot Password ---
const handleForgotPassword = () => {
  navigate("/forgot-password");
};

// --- Submit bằng phím Enter ---
const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && !loading) {
    handleSubmit();
  }
};

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
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
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
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span className="checkbox-label">Ghi nhớ đăng nhập</span>
            </label>
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

          {/* Google Login Button */}
          <button
            type="button"
            className="btn-google"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path 
                fill="#4285F4" 
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path 
                fill="#34A853" 
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path 
                fill="#FBBC05" 
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path 
                fill="#EA4335" 
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Đăng nhập với Google</span>
          </button>

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