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

interface Shipping {
  id: number;
  sku: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_status: string;
}

interface Order {
  id: number;
  sku: string;
  total_amount: string;
  final_amount: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
  shipping: Shipping;
}

const API_URL = "http://127.0.0.1:8000/api/orders";

const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

const STATUS_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "nodone", label: "Chưa thanh toán" },
  { key: "pending", label: "Chờ xử lý" },
  { key: "in_transit", label: "Đang giao hàng" },
  { key: "delivered", label: "Đã giao hàng" },
  { key: "evaluated", label: "Đã Đánh giá" },
  { key: "none", label: "Đã hủy" },
  { key: "failed", label: "Giao thất bại" },
  { key: "return_processing", label: "Xử lý hoàn hàng" },
  { key: "return_fail", label: "Hoàn thất bại" },
  { key: "returned", label: "Đã hoàn hàng" },
  { key: "none", label: "Đã hủy" },
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
      : orders.filter((order) => order.shipping?.shipping_status === activeTab);

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
      return <span className="text-orange-600 font-medium">Thanh toán khi nhận hàng</span>;
    }

    if (m === "vnpay") {
      return <span className="text-green-600 font-medium">VNPAY</span>;
    }

    return <span className="text-gray-500">Không xác định</span>;
  };

  const renderPaymentStatus = (status: string) => {
    const s = (status || "").toLowerCase();

    if (s === "failed") {
      return <span className="text-red-600 font-medium">Thanh toán thất bại</span>;
    }

    if (s === "paid") {
      return <span className="text-green-600 font-medium">Đã thanh toán</span>;
    }

    if (s === "refunded") {
      return <span className="text-blue-600 font-medium">Đã hoàn tiền</span>;
    }

    if (s === "unpaid") {
      return <span className="text-orange-600 font-medium">Chưa thanh toán</span>;
    }

    return <span className="text-gray-500">Không xác định</span>;
  };

  const renderShippingStatus = (status: string) => {
    const s = (status || "").toLowerCase();

    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: "Chờ xử lý", color: "text-orange-600" },
      in_transit: { text: "Đang vận chuyển", color: "text-blue-600" },
      delivered: { text: "Đã giao hàng", color: "text-green-600" },
      evaluated: { text: "Đã Đánh giá", color: "text-green-600" },
      failed: { text: "Giao thất bại", color: "text-red-600" },
      returned: { text: "Đã hoàn hàng", color: "text-purple-600" },
      none: { text: "Đã hủy", color: "text-gray-600" },
      return_processing: { text: "Xử lý hoàn hàng", color: "text-gray-600" },
      nodreturn_fail: { text: "Hoàn thất bại", color: "text-gray-600" },
      nodone: { text: "Chưa thanh toán", color: "text-gray-600" },
      received: { text: "Đã nhận hàng", color: "text-gray-600" },

    };

    const statusInfo = statusMap[s] || { text: "Không xác định", color: "text-gray-500" };

    return <span className={`${statusInfo.color} font-medium`}>{statusInfo.text}</span>;
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
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <span className="font-medium text-gray-700">Mã đơn hàng: </span>
                  <span className="text-blue-600 font-semibold">{order.sku}</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Ngày đặt: {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  {/* Trạng thái giao hàng */}
                  <div className="text-sm">
                    <span className="text-gray-600">Trạng thái: </span>
                    {renderShippingStatus(order.shipping?.shipping_status)}
                  </div>

                  {/* Chỉ hiện thông tin thanh toán nếu đơn chưa bị hủy */}
                  {order.shipping?.shipping_status !== "none" && (
                    <>
                      <div className="text-sm">
                        <span className="text-gray-600">Thanh toán: </span>
                        {renderPaymentStatus(order.payment_status)}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Hình thức: </span>
                        {renderPaymentMethod(order.payment_method)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 flex items-center">
                    <img
                      src={`http://127.0.0.1:8000/${item.product_image}`}
                      alt={item.product_name}
                      className="w-20 h-20 object-cover rounded border border-gray-200"
                    />
                    <div className="ml-4 flex-1">
                      <h3 className="text-gray-800 font-medium text-base">{item.product_name}</h3>
                      <div className="flex gap-4 mt-1">
                        {item.color && (
                          <span className="text-sm text-gray-600">
                            Màu: <span className="font-medium">{item.color}</span>
                          </span>
                        )}
                        {item.size && (
                          <span className="text-sm text-gray-600">
                            Size: <span className="font-medium">{item.size}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Số lượng: <span className="font-medium">{item.quantity}</span> ×{" "}
                        <span className="font-medium text-orange-600">
                          {parseInt(item.price).toLocaleString()}₫
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-800 font-semibold text-lg">
                        {(item.quantity * parseFloat(item.price)).toLocaleString()}₫
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                  >
                    Xem chi tiết →
                  </Link>
                  <div className="text-right">
                    <span className="text-gray-700 text-base">Tổng tiền: </span>
                    <span className="font-bold text-xl text-orange-600">
                      {parseInt(order.final_amount).toLocaleString()}₫
                    </span>
                  </div>
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