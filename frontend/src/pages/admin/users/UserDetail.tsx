import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import userApi, { User } from "../../../api/userApi";

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // 🟢 Lấy thông tin người dùng
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await userApi.getById(id!);
        setUser(data);
      } catch (err) {
        setError("Không thể tải thông tin người dùng.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  // 🟢 Hàm bật/tắt trạng thái (active/inactive)
  const handleToggleStatus = async () => {
    if (!user) return;

    const newStatus = user.status === "active" ? "inactive" : "active";
    const confirmMsg =
      newStatus === "active"
        ? "Bạn có chắc muốn kích hoạt người dùng này?"
        : "Bạn có chắc muốn tạm ngưng người dùng này?";

    if (!window.confirm(confirmMsg)) return;

    setUpdating(true);
    try {
      await userApi.update(user.id, { status: newStatus });
      setUser({ ...user, status: newStatus });
      alert("Cập nhật trạng thái thành công!");
    } catch {
      alert("Lỗi khi cập nhật trạng thái.");
    } finally {
      setUpdating(false);
    }
  };

  // 🟡 Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  // 🔴 Lỗi hoặc không tìm thấy người dùng
  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-500 mb-3">{error || "Không tìm thấy người dùng."}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  // 🟢 Giao diện hiển thị chi tiết
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-2xl mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline flex items-center"
        >
          ← Quay lại
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">Chi tiết người dùng</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-4xl font-bold">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <p className="mt-3 text-lg font-medium text-gray-700">{user.name}</p>
        <p className="text-gray-500 text-sm">{user.email}</p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
        <div>
          <p className="font-medium text-gray-500">Số điện thoại:</p>
          <p>{user.phone || "—"}</p>
        </div>
        <div>
          <p className="font-medium text-gray-500">Địa chỉ:</p>
          <p>{user.address || "—"}</p>
        </div>
        <div>
          <p className="font-medium text-gray-500">Vai trò:</p>
          <p className="capitalize">{user.role || "—"}</p>
        </div>
        <div>
          <p className="font-medium text-gray-500">Trạng thái:</p>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              user.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {user.status === "active" ? "Hoạt động" : "Tạm ngưng"}
          </span>
        </div>
        <div>
          <p className="font-medium text-gray-500">Ngày tạo:</p>
          <p>{user.created_at || "—"}</p>
        </div>
        <div>
          <p className="font-medium text-gray-500">Cập nhật gần nhất:</p>
          <p>{user.updated_at || "—"}</p>
        </div>
      </div>

      {/* Update Button */}
      <div className="mt-8 text-center">
        <button
          onClick={handleToggleStatus}
          disabled={updating}
          className={`px-6 py-3 rounded-lg font-semibold text-white ${
            updating
              ? "bg-gray-400 cursor-not-allowed"
              : user.status === "active"
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {updating
            ? "Đang cập nhật..."
            : user.status === "active"
            ? "Tạm ngưng người dùng"
            : "Kích hoạt người dùng"}
        </button>
      </div>
    </div>
  );
};

export default UserDetail;
