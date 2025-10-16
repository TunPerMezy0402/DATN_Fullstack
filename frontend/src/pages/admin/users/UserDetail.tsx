import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import userApi, { User } from "../../../api/userApi";
import { ArrowLeft, Loader2 } from "lucide-react";

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 🟦 Lấy dữ liệu user theo id
  useEffect(() => {
    if (!id || id === "create") return;
    const fetchUser = async () => {
      try {
        const res = await userApi.getById(id);
        setUser(res);
      } catch (err) {
        console.error("Lỗi khi lấy thông tin user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  // 🟩 Chuyển đổi trạng thái active/inactive
  const handleChangeStatus = async (newStatus: "active" | "inactive") => {
    if (!user || updating || user.status === newStatus) return;
    setUpdating(true);
    try {
      const updated = await userApi.toggleStatus(user.id, newStatus);
      setUser(updated);
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Đang tải dữ liệu...
      </div>
    );

  if (!user)
    return (
      <div className="p-6 text-center text-gray-500">
        Không tìm thấy người dùng.
      </div>
    );

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} /> Quay lại
        </button>
        <h1 className="text-xl font-semibold">Chi tiết người dùng</h1>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-gray-500">Họ và tên</p>
          <p className="font-medium text-lg">{user.name}</p>
        </div>

        <div>
          <p className="text-gray-500">Email</p>
          <p>{user.email}</p>
        </div>

        <div>
          <p className="text-gray-500">Số điện thoại</p>
          <p>{user.phone || "Chưa cập nhật"}</p>
        </div>

        <div>
          <p className="text-gray-500">Địa chỉ</p>
          <p>{user.address || "Chưa cập nhật"}</p>
        </div>

        <div>
          <p className="text-gray-500">Vai trò</p>
          <p className="capitalize">{user.role}</p>
        </div>

        <div>
          <p className="text-gray-500">Trạng thái</p>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              user.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {user.status === "active" ? "Hoạt động" : "Ngưng hoạt động"}
          </span>
        </div>

        {/* 🟧 Hai nút trạng thái */}
        <div className="pt-4 flex gap-3">
          <button
            onClick={() => handleChangeStatus("active")}
            disabled={updating || user.status === "active"}
            className={`px-4 py-2 rounded-lg font-medium text-white ${
              user.status === "active"
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {updating && user.status !== "active"
              ? "Đang cập nhật..."
              : "Hoạt động"}
          </button>

          <button
            onClick={() => handleChangeStatus("inactive")}
            disabled={updating || user.status === "inactive"}
            className={`px-4 py-2 rounded-lg font-medium text-white ${
              user.status === "inactive"
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {updating && user.status !== "inactive"
              ? "Đang cập nhật..."
              : "Tạm ngừng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
