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

  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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
        <div className="loading-spinner"></div>
        <p className="loading-text">Đang tải danh sách người dùng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-box">
          <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          <div>
            <strong>Lỗi!</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Quản lý tài khoản</h1>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-left">
          <input
            type="text"
            placeholder="Tìm theo tên..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="filter-input"
          />
          <input
            type="text"
            placeholder="Tìm theo email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="filter-input"
          />
          <input
            type="text"
            placeholder="Tìm theo SĐT..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="filter-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn-reset">
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
        <button onClick={() => navigate("/admin/users/create")} className="btn-add">
          + Thêm người dùng
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  Không có người dùng phù hợp
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id || `user-${index}`}>
                  <td>{index + 1}</td>
                  <td className="td-name">{user.name || "N/A"}</td>
                  <td>{user.email || "N/A"}</td>
                  <td>{user.phone || "N/A"}</td>
                  <td>
                    <span className={`role-badge ${user.role === "admin" ? "admin" : "user"}`}>
                      {user.role || "user"}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.status === "active" ? "active" : "inactive"}`}>
                      <span className="status-dot"></span>
                      {user.status === "active" ? "Hoạt động" : "Tạm ngưng"}
                    </span>
                  </td>
                  <td className="td-actions">
                    <button onClick={() => navigate(`/admin/users/${user.id}`)} className="action-link view">
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

      {/* Footer */}
      <div className="table-footer">
        Hiển thị {filteredUsers.length} / {users.length} người dùng
      </div>
    </div>
  );
};

export default UserList;