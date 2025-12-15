// src/pages/Unauthorized.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleGoBack = () => {
    // Redirect based on user role
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Icon */}
        <div style={styles.iconContainer}>
          <svg 
            style={styles.icon}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 style={styles.title}>Không có quyền truy cập</h1>
        
        {/* Description */}
        <p style={styles.description}>
          Bạn không có quyền truy cập vào trang này. 
          {user && (
            <span style={styles.userInfo}>
              <br />Tài khoản hiện tại: <strong>{user.email}</strong> ({user.role})
            </span>
          )}
        </p>

        {/* Actions */}
        <div style={styles.actions}>
          <button 
            style={styles.primaryButton}
            onClick={handleGoBack}
          >
            <svg 
              style={styles.buttonIcon}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Quay lại trang chủ
          </button>

          <button 
            style={styles.secondaryButton}
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
          
        {/* Additional Info */}
        <p style={styles.hint}>
          Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ quản trị viên.
        </p>
      </div>
    </div>
  );
};

// Inline styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '1rem',
  },
  content: {
    background: 'white',
    borderRadius: '24px',
    padding: '3rem 2rem',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2rem',
  },
  icon: {
    width: '80px',
    height: '80px',
    color: '#f59e0b',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '1rem',
  },
  description: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '2rem',
    lineHeight: 1.6,
  },
  userInfo: {
    color: '#4b5563',
    fontSize: '0.95rem',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  secondaryButton: {
    padding: '0.875rem 1.5rem',
    background: 'transparent',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  buttonIcon: {
    width: '20px',
    height: '20px',
  },
  hint: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
};

export default Unauthorized;