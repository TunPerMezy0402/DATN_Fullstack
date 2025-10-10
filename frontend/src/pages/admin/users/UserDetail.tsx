// src/layouts/admin/users/UserDetail.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import userApi, { User } from "../../../api/userApi";
import "../../../assets/admin/users/UserDetail.css";

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<0 | 1 | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  useEffect(() => {
    const fetchUserDetail = async () => {
      if (!id) return;
      
      try {
        const data = await userApi.getById(id);
        // Normalize status to number on fetch
        setUser({
          ...data,
          status: Number(data.status)
        });
      } catch (err: any) {
        setError(err?.message || "Không thể tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [id]);

  // Handler khi click button đổi status
  const handleStatusChange = (newStatus: 0 | 1) => {
    if (!user || Number(user.status) == newStatus) {
      return;
    }
    setPendingStatus(newStatus);
    setShowConfirmModal(true);
  };

  // Confirm và thực hiện update
  const confirmStatusChange = async () => {
    if (!user || pendingStatus == null) return;

    setIsUpdating(true);
    
    try {
      // Gọi API update
      const response = await userApi.update(user.id, { status: pendingStatus });
      
      // Update local state với data mới từ API
      setUser(prev => ({
        ...prev!,
        ...response,
        status: Number(response.status) // Ensure number type
      }));
      
      // Close modal
      setShowConfirmModal(false);
      setPendingStatus(null);
      
      // Show success notification
      setShowSuccessNotification(true);
      const timeoutId = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
      
      // Cleanup timeout
      return () => clearTimeout(timeoutId);
      
    } catch (err: any) {
      console.error('Lỗi khi cập nhật status:', err);
      
      // Hiển thị lỗi chi tiết hơn
      const errorMessage = err?.response?.data?.message 
        || err?.message 
        || "Không thể cập nhật trạng thái. Vui lòng thử lại.";
      
      alert(errorMessage);
      
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelStatusChange = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="user-detail-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="user-detail-container">
        <div className="error-state">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2"/>
              <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2"/>
            </svg>
          </div>
          <h3>Đã xảy ra lỗi</h3>
          <p>{error || "Không tìm thấy người dùng"}</p>
          <button onClick={() => navigate("/admin/users")} className="btn-back-error">
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // Tính toán trạng thái hiện tại
  const currentStatus = Number(user.status);
  const isActive = currentStatus == 0;

  return (
    <div className="user-detail-container">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="success-notification">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Cập nhật trạng thái thành công!</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate("/admin/users")} className="btn-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Quay lại
        </button>
        <h1>Thông tin người dùng</h1>
      </div>

      <div className="user-detail-content">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="profile-card">
            <div className="avatar-wrapper">
              <div className="avatar-large">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
                <span className="status-dot"></span>
              </div>
            </div>
            
            <div className="profile-info">
              <h2 className="user-name">{user.name || "Chưa cập nhật"}</h2>
              <p className="user-email">{user.email || "N/A"}</p>
              
              <div className="badges-group">
                <span className={`badge badge-role ${user.role || 'user'}`}>
                  {user.role == 'admin' ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                      Quản trị viên
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      Người dùng
                    </>
                  )}
                </span>
                <span className={`badge badge-status ${isActive ? 'active' : 'inactive'}`}>
                  <span className="dot"></span>
                  {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>
            </div>
          </div>

          {/* Status Control */}
          <div className="status-control-card">
            <div className="card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Quản lý trạng thái</h3>
            </div>
            <p className="card-description">
              Cập nhật trạng thái hoạt động của tài khoản
            </p>
            
            <div className="status-toggle-group">
              {/* Nút Hoạt động - Status = 0 */}
              <button
                onClick={() => handleStatusChange(0)}
                disabled={currentStatus == 0 || isUpdating}
                className={`status-toggle-btn ${currentStatus == 0 ? 'active' : ''}`}
              >
                <div className="btn-icon success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="btn-content">
                  <span className="btn-title">Hoạt động</span>
                  <span className="btn-subtitle">Cho phép truy cập hệ thống</span>
                </div>
                {currentStatus == 0 && (
                  <div className="checkmark">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                )}
              </button>

              {/* Nút Tạm ngưng - Status = 1 */}
              <button
                onClick={() => handleStatusChange(1)}
                disabled={currentStatus == 1 || isUpdating}
                className={`status-toggle-btn ${currentStatus == 1 ? 'active' : ''}`}
              >
                <div className="btn-icon danger">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="btn-content">
                  <span className="btn-title">Tạm ngưng</span>
                  <span className="btn-subtitle">Vô hiệu hóa tài khoản</span>
                </div>
                {currentStatus == 1 && (
                  <div className="checkmark">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="info-grid">
          {/* Personal Information */}
          <div className="info-card">
            <div className="info-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Thông tin cá nhân</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <label>Họ và tên</label>
                <span>{user.name || "Chưa cập nhật"}</span>
              </div>
              <div className="info-item">
                <label>Vai trò</label>
                <span className={`role-label ${user.role || 'user'}`}>
                  {user.role == 'admin' ? 'Quản trị viên' : 'Người dùng'}
                </span>
              </div>
              <div className="info-item">
                <label>Trạng thái</label>
                <span className={`status-label ${isActive ? 'active' : 'inactive'}`}>
                  <span className="dot"></span>
                  {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="info-card">
            <div className="info-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Thông tin liên hệ</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <label>Email</label>
                <span className="email-value">{user.email || "Chưa cập nhật"}</span>
              </div>
              <div className="info-item">
                <label>Số điện thoại</label>
                <span>{user.phone || "Chưa cập nhật"}</span>
              </div>
              <div className="info-item">
                <label>Địa chỉ</label>
                <span>{user.address || "Chưa cập nhật"}</span>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="info-card">
            <div className="info-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Thông tin hệ thống</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <label>Mã người dùng</label>
                <span className="code-value">{user.id || "N/A"}</span>
              </div>
              <div className="info-item">
                <label>Ngày tạo</label>
                <span>{formatDate(user.created_at)}</span>
              </div>
              <div className="info-item">
                <label>Cập nhật lần cuối</label>
                <span>{formatDate(user.updated_at || user.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={cancelStatusChange}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon-wrapper ${pendingStatus == 0 ? 'success' : 'danger'}`}>
              {pendingStatus == 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            
            <h3 className="modal-title">
              {pendingStatus == 0 ? 'Xác nhận kích hoạt tài khoản' : 'Xác nhận tạm ngưng tài khoản'}
            </h3>
            
            <p className="modal-message">
              {pendingStatus == 0 
                ? `Bạn có chắc chắn muốn kích hoạt tài khoản của "${user.name}"? Người dùng sẽ có thể đăng nhập và sử dụng đầy đủ chức năng của hệ thống.`
                : `Bạn có chắc chắn muốn tạm ngưng tài khoản của "${user.name}"? Người dùng sẽ không thể đăng nhập vào hệ thống cho đến khi được kích hoạt lại.`
              }
            </p>
            
            <div className="modal-actions">
              <button
                onClick={cancelStatusChange}
                disabled={isUpdating}
                className="modal-btn btn-cancel"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={isUpdating}
                className={`modal-btn btn-confirm ${pendingStatus == 0 ? 'success' : 'danger'}`}
              >
                {isUpdating ? (
                  <>
                    <div className="spinner"></div>
                    Đang xử lý...
                  </>
                ) : (
                  pendingStatus == 0 ? 'Xác nhận kích hoạt' : 'Xác nhận tạm ngưng'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetail;