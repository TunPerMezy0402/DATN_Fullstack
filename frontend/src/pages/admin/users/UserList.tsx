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

  // Bộ lọc
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Lấy dữ liệu
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data: any = await userApi.getAll();
        const userList = Array.isArray(data)
          ? data
          : data?.users || data?.data || [];
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

  // Lọc người dùng
  useEffect(() => {
    let result = [...users];

    if (searchName.trim()) {
      result = result.filter((u) =>
        u.name?.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (searchEmail.trim()) {
      result = result.filter((u) =>
        u.email?.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    if (searchPhone.trim()) {
      result = result.filter((u) => u.phone?.includes(searchPhone));
    }

    if (filterStatus !== "all") {
      result = result.filter((u) => u.status === filterStatus);
    }

    setFilteredUsers(result);
  }, [searchName, searchEmail, searchPhone, filterStatus, users]);

  const handleClearFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSearchPhone("");
    setFilterStatus("all");
  };

  const hasActiveFilters =
    searchName || searchEmail || searchPhone || filterStatus !== "all";

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Đang tải danh sách người dùng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-wrapper">
          <div className="error-box">
            <div className="error-content">
              <svg
                className="error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                />
              </svg>
              <div>
                <strong className="error-title">Lỗi!</strong>
                <p className="error-message">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="header-card">
          <div className="header-content">
            <div className="header-info">
              <h1 className="page-title">Quản lý người dùng</h1>
              <p className="page-stats">
                Tổng số: <span className="stats-number">{users.length}</span>{" "}
                người dùng
                {hasActiveFilters && (
                  <span className="stats-filtered">
                    (Hiển thị: {filteredUsers.length})
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/users/create")}
              className="btn-add-user"
            >
              <svg
                className="btn-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Thêm người dùng
            </button>
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="filter-card">
          <div className="filter-header">
            <h3 className="filter-title">
              <svg
                className="filter-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Tìm kiếm & Lọc
            </h3>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="btn-clear-filter">
                <svg
                  className="btn-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>

          <div className="filter-grid">
            <div className="input-group">
              <label className="input-label">Tên người dùng</label>
              <input
                type="text"
                placeholder="Tìm theo tên..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="text"
                placeholder="Tìm theo email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Số điện thoại</label>
              <input
                type="text"
                placeholder="Tìm theo SĐT..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field"
              >
                <option value="all">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bảng người dùng */}
        <div className="table-card">
          <div className="table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      <svg
                        className="empty-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p className="empty-text">Không có người dùng phù hợp</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id || `user-${index}`}>
                      <td className="td-index">{index + 1}</td>
                      <td className="td-name">{user.name || "N/A"}</td>
                      <td className="td-email">{user.email || "N/A"}</td>
                      <td className="td-phone">{user.phone || "N/A"}</td>
                      <td>
                        <span
                          className={`role-badge ${
                            user.role === "admin" ? "admin" : "user"
                          }`}
                        >
                          <span className="role-icon">
                            {user.role === "admin" ? "👑" : "👤"}
                          </span>
                          {user.role || "user"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            user.status === "active" ? "active" : "inactive"
                          }`}
                        >
                          <span
                            className={`status-dot ${
                              user.status === "active" ? "active" : "inactive"
                            }`}
                          />
                          {user.status === "active" ? "Hoạt động" : "Tạm ngưng"}
                        </span>
                      </td>
                      <td className="td-action">
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          className="btn-detail"
                        >
                          <svg
                            className="btn-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
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
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserList;