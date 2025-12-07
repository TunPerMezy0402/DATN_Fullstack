import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, SafetyOutlined } from "@ant-design/icons";
import userApi, { User } from "../../../api/userApi";
import "../../../assets/admin/users/UserDetail.css";

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!id || id === "create") return;
    const fetchUser = async () => {
      try {
        const res = await userApi.getById(id);
        setUser(res);
        setSelectedStatus(res.status || "active");
      } catch (err) {
        console.error("Lỗi khi lấy thông tin user:", err);
        messageApi.error("Không thể tải thông tin người dùng!");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, messageApi]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
  };

  const handleSubmit = async () => {
    if (!user || updating || user.status === selectedStatus) return;
    
    setUpdating(true);
    try {
      const updateData = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: selectedStatus as "active" | "inactive"
      };
      await userApi.update(user.id, updateData);
      
      messageApi.success({
        content: "Cập nhật trạng thái thành công!",
        duration: 2,
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Lỗi khi cập nhật trạng thái:", err);
      messageApi.error(err?.response?.data?.message || "Lỗi khi cập nhật trạng thái!");
      setSelectedStatus(user.status);
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container">
        <div className="empty-state">Không tìm thấy người dùng.</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {contextHolder}
      
      <div className="page-header">
        <h1 className="page-title">Chi tiết tài khoản</h1>
      </div>

      <div className="detail-card">
        <div className="detail-grid">
          <div className="detail-item">
            <label className="detail-label">
              <UserOutlined style={{ marginRight: 8 }} />
              Họ và tên
            </label>
            <p className="detail-value">{user.name}</p>
          </div>

          <div className="detail-item">
            <label className="detail-label">
              <MailOutlined style={{ marginRight: 8 }} />
              Email
            </label>
            <p className="detail-value">{user.email}</p>
          </div>

          <div className="detail-item">
            <label className="detail-label">
              <PhoneOutlined style={{ marginRight: 8 }} />
              Số điện thoại
            </label>
            <p className="detail-value">{user.phone || "Chưa cập nhật"}</p>
          </div>

          <div className="detail-item">
            <label className="detail-label">
              <SafetyOutlined style={{ marginRight: 8 }} />
              Vai trò
            </label>
            <p className="detail-value">
              <span className={`role-badge ${user.role === "admin" ? "admin" : "user"}`}>
                {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
              </span>
            </p>
          </div>

          <div className="detail-item">
            <label className="detail-label">
              <SafetyOutlined style={{ marginRight: 8 }} />
              Trạng thái
            </label>
            <div className="detail-value">
              <select
                value={selectedStatus}
                onChange={handleStatusChange}
                className={`status-select ${selectedStatus === "active" ? "active" : "inactive"}`}
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Khóa tài khoản</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-[13px] font-medium bg-white text-gray-700 border border-gray-300 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100"
          >
            ← Quay lại
          </button>
          <button
            onClick={handleSubmit}
            disabled={updating || user.status === selectedStatus}
            className={`px-5 py-2 text-[13px] font-medium text-white border-none rounded-md cursor-pointer transition-all duration-200 ${
              updating || user.status === selectedStatus
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
            }`}
          >
            {updating ? "Đang cập nhật..." : "Cập nhật"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;