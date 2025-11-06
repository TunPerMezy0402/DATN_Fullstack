import React, { useEffect, useState } from "react";
import axios from "axios";
import { ShoppingOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

interface OrderItem {
  id: number;
  product_name: string;
  product_image: string;
  size: string;
  color: string;
  quantity: number;
  price: string;
}

interface Order {
  id: number;
  sku: string;
  total_amount: string;
  final_amount: string;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
}

const API_URL = "http://127.0.0.1:8000/api/orders";

const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

const STATUS_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "confirmed", label: "Vận chuyển" },
  { key: "shipped", label: "Chờ giao hàng" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "returned", label: "Trả hàng/Hoàn tiền" },
];

const OrderUser: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    const fetchUserOrders = async () => {
      try {
        const token = getAuthToken();

        if (!token) {
          console.error("Không tìm thấy token xác thực");
          setLoading(false);
          return;
        }

        const res = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        const ordersData = Array.isArray(res.data.data) ? res.data.data : [];
        setOrders(ordersData);
      } catch (error: any) {
        console.error("Lỗi khi tải danh sách đơn hàng:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, []);

  const filteredOrders =
    activeTab === "all"
      ? orders
      : orders.filter((order) => order.status === activeTab);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPaymentMethod = (method: string) => {
    const m = (method || "").toLowerCase();

    if (m === "cod") {
      return <span className="text-red-500">Thanh toán khi nhận hàng</span>;
    }

    if (m === "vnpay") {
      return <span className="text-green-600">VNPAY</span>;
    }

    return <span className="text-gray-500">Không xác định</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gray-600 text-lg">
        Đang tải danh sách đơn hàng...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Đơn hàng của tôi</h1>

      {/* Tabs trạng thái */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-6 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200
              ${
                activeTab === tab.key
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-orange-500"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách đơn hàng */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingOutlined className="text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Không có đơn hàng nào</p>
          <Link
            to="/products"
            className="mt-4 inline-block bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
          >
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-700">Mã đơn hàng: </span>
                  <span className="text-blue-600">{order.sku}</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Ngày đặt: {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  Hình thức thanh toán: {renderPaymentMethod(order.payment_method)}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 flex">
                    <img
                      src={`http://127.0.0.1:8000/${item.product_image}`}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <div className="ml-4 flex-1">
                      <h3 className="text-gray-800 font-medium">{item.product_name}</h3>
                      <p className="text-sm text-gray-500">
                        Màu: {item.color} | Size: {item.size}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        SL: {item.quantity} ×{" "}
                        <span className="font-medium text-green-700">
                          {parseInt(item.price).toLocaleString()}₫
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-gray-800 font-medium">
                      {(item.quantity * parseFloat(item.price)).toLocaleString()}₫
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-right">
                <span className="text-gray-700">
                  Tổng tiền:{" "}
                  <span className="font-semibold text-lg text-green-700">
                    {parseInt(order.final_amount).toLocaleString()}₫
                  </span>
                </span>
                <div className="mt-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderUser;
