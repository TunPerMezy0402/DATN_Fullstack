import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../../api/userApi";

const UserCreate: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    role: "user",
    status: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "status" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await userApi.create(formData as any);
      alert("✅ Tạo người dùng thành công!");
      navigate("/admin/users");
    } catch (err: any) {
      console.error(err);
      setError("❌ Lỗi khi tạo người dùng. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-2xl mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Thêm người dùng mới</h2>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline"
        >
          ← Quay lại
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Họ tên */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Họ tên</label>
          <input
            type="text"
            name="name"
            placeholder="Nhập họ tên"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            placeholder="Nhập email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">
            Số điện thoại
          </label>
          <input
            type="text"
            name="phone"
            placeholder="Nhập số điện thoại"
            value={formData.phone}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Địa chỉ */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Địa chỉ</label>
          <input
            type="text"
            name="address"
            placeholder="Nhập địa chỉ"
            value={formData.address}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vai trò */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Vai trò</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="user">Người dùng</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </div>

        {/* Trạng thái */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Trạng thái</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Hoạt động</option>
            <option value={1}>Tạm ngưng</option>
          </select>
        </div>

        {/* Nút submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Đang tạo..." : "Tạo người dùng"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserCreate;
