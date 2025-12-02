import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import userApi from "../../../api/userApi";
import "../../../assets/admin/users/UserCreate.css";

const UserCreate: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Họ tên là bắt buộc";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email là bắt buộc";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!formData.password) {
      newErrors.password = "Mật khẩu là bắt buộc";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone)) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await userApi.create(formData as any);
      messageApi.success({
        content: "Tạo người dùng thành công!",
        duration: 2,
      });
      setTimeout(() => {
        navigate("/admin/users");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Lỗi khi tạo người dùng. Vui lòng thử lại!";
      messageApi.error(errorMsg);
      setErrors({ submit: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {contextHolder}
      
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Thêm tài khoản mới</h1>
      </div>

      {/* Form Card */}
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div className="alert-error">
              <svg className="icon-sm" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
              </svg>
              {errors.submit}
            </div>
          )}

          <div className="form-grid">
            {/* Họ tên */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Họ tên <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Nhập họ và tên"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? "error" : ""}`}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? "error" : ""}`}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* Số điện thoại */}
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Số điện thoại
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                placeholder="0xxxxxxxxx"
                value={formData.phone}
                onChange={handleChange}
                className={`form-input ${errors.phone ? "error" : ""}`}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            {/* Mật khẩu */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Mật khẩu <span className="required">*</span>
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? "error" : ""}`}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="icon-sm" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg className="icon-sm" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            {/* Vai trò */}
            <div className="form-group">
              <label className="form-label" htmlFor="role">
                Vai trò
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input"
              >
                <option value="user">Người dùng</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className={`px-4 py-2 text-[13px] font-medium bg-white text-gray-700 border border-gray-300 rounded-md transition-all duration-200 ${
                loading
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100'
              }`}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-[13px] font-medium text-white border-none rounded-md transition-all duration-200 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed opacity-60'
                  : 'bg-blue-500 cursor-pointer hover:bg-blue-600 active:bg-blue-700'
              }`}
            >
              {loading ? "Đang tạo..." : "+ Thêm tài khoản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreate;