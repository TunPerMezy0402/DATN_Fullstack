// src/layouts/admin/users/UserList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi, { User } from "../../../api/userApi";
import "../../../assets/admin/users/UserList.css";


const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data: any = await userApi.getAll();
        setUsers(Array.isArray(data) ? data : data?.users || data?.data || []);
      } catch (err: any) {
        setError(err?.message || "Không thể tải danh sách người dùng");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleViewDetail = (userId: string) => {
    navigate(`/admin/users/${userId}`);
  };

  if (loading) return (
    <div className="loading-container">
      <div className="text-center">
        <div className="loading-spinner" />
        <p className="text-gray-700 text-lg font-medium">Đang tải danh sách người dùng...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="user-list-container">
      <div className="error-container">
        <div className="error-box">
          <div className="flex items-center">
            <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
            <div>
              <strong className="font-bold text-lg">Lỗi!</strong>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="user-list-container">
      <div className="user-list-wrapper">
        {/* Header */}
        <div className="user-list-header">
          <h1 className="user-list-title">Quản lý người dùng</h1>
          <div className="user-list-stats">
            <p>
              Tổng số: <span className="user-count">{users.length}</span> người dùng
            </p>
            <span className="divider" />
            <button className="add-user-btn">+ Thêm người dùng</button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="empty-title">Không có người dùng nào trong hệ thống</p>
            <p className="empty-subtitle">Hãy thêm người dùng đầu tiên</p>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Địa chỉ</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user._id || `user-${index}`}>
                      <td>
                        <span className="stt-badge">{index + 1}</span>
                      </td>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="user-details">
                            <div className="user-name">{user.name || "N/A"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="user-email">{user.email || "N/A"}</div>
                      </td>
                      <td>
                        <div className="user-address">{user.address || "N/A"}</div>
                      </td>
                      <td>
                        <span className={`role-badge ${user.role || 'user'}`}>
                          {user.role === 'admin' ? '👑' : '👤'} {user.role || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.status ? 'active' : 'inactive'}`}>
                          <span className={`status-dot ${user.status ? 'active' : 'inactive'}`} />
                          {user.status ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleViewDetail(user._id)}
                          className="action-btn view-btn"
                          title="Xem chi tiết"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;