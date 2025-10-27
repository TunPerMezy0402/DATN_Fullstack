import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Eye, RotateCcw, Edit } from "lucide-react";

// ==============================
// 🧩 Kiểu dữ liệu đơn hàng
// ==============================
interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id: number;
  product_name?: string | null;
  product_image?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: string | number;
}

interface Order {
  id: number;
  sku?: string;
  user_id: number;
  total_amount?: string | number | null;
  discount_amount?: string | number | null;
  final_amount?: string | number | null;
  status: "pending" | "completed" | "cancelled" | string;
  payment_status?: string;
  created_at: string;
  items: OrderItem[];
}

// ==============================
// ⚙️ Cấu hình API
// ==============================
const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: { Accept: "application/json" },
});

// Thêm token tự động vào mọi request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==============================
// 🧾 Component OrderList
// ==============================
const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // ==============================
  // 📦 Lấy danh sách đơn hàng
  // ==============================
  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const res = await API.get(`/admin/orders-admin?page=${page}`);
      const data = res.data;

      if (data.data && Array.isArray(data.data)) {
        setOrders(data.data);
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          per_page: data.per_page,
          total: data.total,
        });
      } else {
        setOrders([]);
        setPagination({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
      }
    } catch (err: any) {
      console.error("❌ Lỗi khi gọi API:", err);
      if (err.response?.status === 401) setError("Bạn chưa đăng nhập hoặc token đã hết hạn.");
      else if (err.response?.status === 403) setError("Bạn không có quyền truy cập trang này.");
      else setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // ⚡ Gọi API khi load trang
  // ==============================
  useEffect(() => {
    fetchOrders();
  }, []);

  // ==============================
  // 💡 JSX hiển thị
  // ==============================
  if (loading)
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Đang tải danh sách đơn hàng...
      </div>
    );

  if (error)
    return (
      <div className="text-center text-red-500 py-20">
        {error}
        <div className="mt-3 flex justify-center gap-2">
          <button
            className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
            onClick={() => fetchOrders(pagination.current_page)}
          >
            Thử lại
          </button>
          {error.includes("token") && (
            <button
              className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
              onClick={() => (window.location.href = "/login")}
            >
              Đăng nhập lại
            </button>
          )}
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <div className="bg-white shadow rounded-lg mb-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-4 py-3">
          <h2 className="text-xl font-semibold">📦 Quản lý đơn hàng</h2>
          <button
            className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center text-sm"
            onClick={() => fetchOrders(pagination.current_page)}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Làm mới
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-700 border-b">
              <tr>
                <th className="py-2 px-3 text-left">Mã đơn</th>
                <th className="py-2 px-3 text-left">Người dùng</th>
                <th className="py-2 px-3 text-right">Tổng tiền</th>
                <th className="py-2 px-3 text-right">Giảm giá</th>
                <th className="py-2 px-3 text-right">Thanh toán</th>
                <th className="py-2 px-3 text-center">Trạng thái</th>
                <th className="py-2 px-3 text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500 italic">
                    Chưa có đơn hàng nào.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-2 px-3 font-medium text-gray-800">
                      {order.sku || `#${order.id}`}
                    </td>
                    <td className="py-2 px-3 text-gray-700">#{order.user_id}</td>
                    <td className="py-2 px-3 text-right">
                      {Number(order.total_amount || 0).toLocaleString()}₫
                    </td>
                    <td className="py-2 px-3 text-right text-red-500">
                      -{Number(order.discount_amount || 0).toLocaleString()}₫
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {Number(order.final_amount || 0).toLocaleString()}₫
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          className="p-2 border rounded hover:bg-gray-100"
                          onClick={() =>
                            (window.location.href = `/admin/orders/${order.id}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 border rounded hover:bg-blue-50 text-blue-600"
                          onClick={() =>
                            (window.location.href = `/admin/orders/${order.id}/edit`)
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={pagination.current_page <= 1}
            onClick={() => fetchOrders(pagination.current_page - 1)}
          >
            Trước
          </button>
          <span>
            Trang {pagination.current_page} / {pagination.last_page}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={pagination.current_page >= pagination.last_page}
            onClick={() => fetchOrders(pagination.current_page + 1)}
          >
            Tiếp
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderList;
