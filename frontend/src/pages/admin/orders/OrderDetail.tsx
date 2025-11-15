import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Descriptions,
  Divider,
  Typography,
  message,
  Card,
  Tag,
  Spin,
  Button,
  Row,
  Col,
  Space,
  Timeline,
  Avatar,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
  CarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { provinces, districts, wards } from "vietnam-provinces";

const { Text, Title } = Typography;

interface Shipping {
  id: number;
  sku: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_status: string;
  city: string;
  district: string;
  commune: string;
  village: string;
  notes?: string | null;
  shipper_name?: string | null;
  shipper_phone?: string | null;
}

interface OrderItem {
  id: number;
  product_id: number;
  variant_id?: number;
  product_name: string;
  product_image?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: string;
  total: number;
}

interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
}

interface Payment {
  id: number;
  payment_method: string;
  status: string;
  amount: string;
}

interface Order {
  id: number;
  sku: string;
  total_amount: string;
  final_amount: string;
  payment_status: string;
  payment_method: string;
  note?: string;
  user: User;
  items: OrderItem[];
  shipping: Shipping;
  payments: Payment | null;
}

const API_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";

// Helper: lấy tên địa danh từ code
const getProvinceName = (code?: string) =>
  provinces.find((p) => p.code === code)?.name || "";
const getDistrictName = (code?: string) =>
  districts.find((d) => d.code === code)?.name || "";
const getWardName = (code?: string) =>
  wards.find((w) => w.code === code)?.name || "";



// Map trạng thái thanh toán
const paymentStatusMap: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thanh toán thất bại",
  pending: "Đang chờ xử lý",
};

const paymentStatusColors: Record<string, string> = {
  unpaid: "default",
  paid: "green",
  refunded: "orange",
  failed: "red",
  pending: "gold",
};

// Map trạng thái vận chuyển
const shippingStatusMap: Record<string, string> = {
  pending: "Chờ xử lý",
  in_transit: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  failed: "Giao thất bại",
  returned: "Đã hoàn hàng",
};

const shippingStatusColors: Record<string, string> = {
  pending: "default",
  in_transit: "blue",
  delivered: "green",
  failed: "red",
  returned: "volcano",
};

const paymentMethodMap: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPAY",
};

const paymentMethodColors: Record<string, string> = {
  cod: "red",
  vnpay: "green",
};


const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/orders-admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrder(res.data.data);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải chi tiết đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải chi tiết đơn hàng..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Title level={4}>Không tìm thấy đơn hàng!</Title>
        <Button type="primary" onClick={() => navigate("/orders")}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const s = order.shipping;

  // Tạo địa chỉ đầy đủ
  const addressParts = [
    s?.notes ? s.notes.trim() : null,
    s?.village || null,
    getWardName(s?.commune),
    getDistrictName(s?.district),
    getProvinceName(s?.city),
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/orders")}
              >
                Quay lại
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Đơn hàng #{order.sku}
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="large"
              onClick={() => navigate(`/admin/orders/${id}/edit`)}
            >
              Cập nhật đơn hàng
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Cột trái */}
        <Col xs={24} lg={16}>
          {/* Thông tin khách hàng */}
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Thông tin khách hàng</span>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            <Descriptions column={1} size="middle">
              <Descriptions.Item
                label={
                  <Space>
                    <UserOutlined />
                    Họ tên
                  </Space>
                }
              >
                <Text strong>{order.user?.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <PhoneOutlined />
                    Số điện thoại
                  </Space>
                }
              >
                {order.user?.phone}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <MailOutlined />
                    Email
                  </Space>
                }
              >
                {order.user?.email}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Chi tiết sản phẩm */}
          <Card
            title={
              <Space>
                <ShoppingCartOutlined />
                <span>Chi tiết sản phẩm</span>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            {order.items.map((item, index) => (
              <div key={item.id}>
                <Row gutter={16} align="middle">
                  <Col>
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #f0f0f0",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          backgroundColor: "#f5f5f5",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ShoppingCartOutlined style={{ fontSize: 32, color: "#ccc" }} />
                      </div>
                    )}
                  </Col>
                  <Col flex={1}>
                    <Text strong style={{ fontSize: 16, display: "block" }}>
                      {item.product_name}
                    </Text>
                    <Space size="large" style={{ marginTop: 8 }}>
                      {item.size && (
                        <Text type="secondary">Kích thước: {item.size}</Text>
                      )}
                      {item.color && (
                        <Text type="secondary">Màu sắc: {item.color}</Text>
                      )}
                      <Text type="secondary">Số lượng: {item.quantity}</Text>
                    </Space>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">Đơn giá: </Text>
                      <Text strong>
                        {parseFloat(item.price).toLocaleString("vi-VN")}₫
                      </Text>
                    </div>
                  </Col>
                  <Col>
                    <Text
                      strong
                      style={{ fontSize: 16, color: "#ff4d4f" }}
                    >
                      {item.total.toLocaleString("vi-VN")}₫
                    </Text>
                  </Col>
                </Row>
                {index < order.items.length - 1 && <Divider />}
              </div>
            ))}

            <Divider />
            <Row justify="end">
              <Col>
                <Space direction="vertical" align="end">
                  <Text type="secondary">Tạm tính:</Text>
                  <Title level={4} style={{ margin: 0, color: "#ff4d4f" }}>
                    {parseFloat(order.final_amount).toLocaleString("vi-VN")}₫
                  </Title>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Thông tin vận chuyển */}
          <Card
            title={
              <Space>
                <CarOutlined />
                <span>Thông tin vận chuyển</span>
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            <Descriptions column={1} size="middle">
              <Descriptions.Item label="Mã vận đơn">
                <Text strong>{s?.sku || "—"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Người nhận">
                <Text strong>{s?.shipping_name || "—"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {s?.shipping_phone || "—"}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <EnvironmentOutlined />
                    Địa chỉ giao hàng
                  </Space>
                }
              >
                {fullAddress || "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Cột phải */}
        <Col xs={24} lg={8}>
          {/* Trạng thái đơn hàng */}
          <Card
            title="Trạng thái đơn hàng"
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>

              <div>
                <Text type="secondary">Hình thức thanh toán:</Text>
                <br />
                <Tag
                  color={paymentMethodColors[order.payment_method] || "default"}
                  style={{ marginTop: 8, fontSize: 14, padding: "4px 12px" }}
                >
                  {paymentMethodMap[order.payment_method] || order.payment_method}
                </Tag>
              </div>

              <div>
                <Text type="secondary">Trạng thái hiện tại:</Text>
                <Tag color={shippingStatusColors[s?.shipping_status] || "default"}>
                  {shippingStatusMap[s?.shipping_status] || s?.shipping_status || "—"}
                </Tag>
                <br />
              </div>

              <div>
                <Text type="secondary">Trạng thái thanh toán:</Text>
                <br />
                <Tag
                  color={paymentStatusColors[order.payment_status] || "default"}
                  style={{ marginTop: 8, fontSize: 14, padding: "4px 12px" }}
                >
                  {paymentStatusMap[order.payment_status] || order.payment_status}
                </Tag>
              </div>

              {order.note && (
                <div>
                  <Text type="secondary">Ghi chú:</Text>
                  <br />
                  <Text style={{ marginTop: 8, display: "block" }}>
                    {order.note}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderDetail;