// src/layouts/admin/users/UserList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi, { User } from "../../../api/userApi";
import "../../../assets/admin/users/UserList.css";

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Filter states
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data: any = await userApi.getAll();
        const userList = Array.isArray(data) ? data : data?.users || data?.data || [];
        setUsers(userList);
        setFilteredUsers(userList);
      } catch (err: any) {
        setError(err?.message || "Không thể tải danh sách người dùng");
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users];

    if (searchName.trim()) {
      result = result.filter(user => 
        user.name?.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (searchEmail.trim()) {
      result = result.filter(user => 
        user.email?.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    if (searchPhone.trim()) {
      result = result.filter(user => 
        user.phone?.includes(searchPhone)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter(user => {
        if (filterStatus === "active") return user.status == 0;
        if (filterStatus === "inactive") return user.status != 0;
        return true;
      });
    }

    setFilteredUsers(result);
  }, [searchName, searchEmail, searchPhone, filterStatus, users]);


  const handleClearFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSearchPhone("");
    setFilterStatus("all");
  };

  const hasActiveFilters = searchName || searchEmail || searchPhone || filterStatus !== "all";

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
              {hasActiveFilters && (
                <span className="text-sm text-gray-600 ml-2">
                  (Hiển thị: {filteredUsers.length})
                </span>
              )}
            </p>
            <span className="divider" />
            <button className="add-user-btn">+ Thêm người dùng</button>
          </div>
        </div>

        {/* Enhanced Filter Section */}
        <div className="search-filter-container">
          <div className="search-header">
            <div className="search-icon-wrapper">
              <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="search-title">Tìm kiếm & Lọc</h3>
            {hasActiveFilters && (
              <div className="active-filters-badge">
                <span className="filter-count">{
                  [searchName, searchEmail, searchPhone, filterStatus !== "all"].filter(Boolean).length
                }</span>
                bộ lọc đang áp dụng
              </div>
            )}
          </div>

          <div className="search-grid">
            <div className="search-input-group">
              <label className="search-label">
                <svg className="label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Tên người dùng
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Tìm theo tên..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="search-input"
                />
                {searchName && (
                  <button 
                    className="clear-input-btn"
                    onClick={() => setSearchName("")}
                    title="Xóa"
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="search-input-group">
              <label className="search-label">
                <svg className="label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Tìm theo email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="search-input"
                />
                {searchEmail && (
                  <button 
                    className="clear-input-btn"
                    onClick={() => setSearchEmail("")}
                    title="Xóa"
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="search-input-group">
              <label className="search-label">
                <svg className="label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Số điện thoại
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Tìm theo SĐT..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="search-input"
                />
                {searchPhone && (
                  <button 
                    className="clear-input-btn"
                    onClick={() => setSearchPhone("")}
                    title="Xóa"
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="search-input-group">
              <label className="search-label">
                <svg className="label-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Trạng thái
              </label>
              <div className="select-wrapper">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="search-select"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">✓ Hoạt động</option>
                  <option value="inactive">✕ Tạm ngưng</option>
                </select>
                <svg className="select-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="search-actions">
              <button
                onClick={handleClearFilters}
                className="clear-filters-btn"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Search Results Info */}
        {hasActiveFilters && (
          <div className="search-results-info">
            <svg className="results-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Tìm thấy <strong>{filteredUsers.length}</strong> kết quả trong tổng số <strong>{users.length}</strong> người dùng
            </span>
          </div>
        )}

        {filteredUsers.length === 0 ? (
          <div className="empty-state-enhanced">
            <div className="empty-icon-wrapper">
              <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="empty-title">
              {hasActiveFilters ? 'Không tìm thấy kết quả phù hợp' : 'Không có người dùng nào'}
            </h3>
            <p className="empty-subtitle">
              {hasActiveFilters 
                ? 'Hãy thử điều chỉnh tiêu chí tìm kiếm hoặc xóa bộ lọc' 
                : 'Hệ thống chưa có người dùng nào. Hãy thêm người dùng đầu tiên!'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="empty-action-btn"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Đặt lại bộ lọc
              </button>
            )}
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
                    <th>Số Điện Thoại</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id || `user-${index}`}>
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
                        <div className="user-phone">{user.phone || "N/A"}</div>
                      </td>
                      <td>
                        <span className={`role-badge ${user.role || 'user'}`}>
                          {user.role === 'admin' ? '👑' : '👤'} {user.role || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.status == 0 ? 'active' : 'inactive'}`}>
                          <span className={`status-dot ${user.status == 0 ? 'active' : 'inactive'}`} />
                          {user.status == 0 ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => navigate(`/admin/users/${user.id}`)}
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