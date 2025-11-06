import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Typography,
  message,
  Spin,
  Button,
  Row,
  Col,
  Space,
  Timeline,
  Tag,
  Divider,
  Steps,
} from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { provinces, districts, wards } from "vietnam-provinces";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const { Text, Title } = Typography;

interface OrderItem {
  id: number;
  product_id: number;
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

interface Order {
  id: number;
  sku: string;
  total_amount: string;
  final_amount: string;
  status: string;
  payment_status: string;
  payment_method: string;
  note?: string;
  created_at: string;
  user: User;
  items: OrderItem[];
  shipping: Shipping;
}

const API_URL = "http://127.0.0.1:8000/api";
const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

// Helper functions
const getProvinceName = (code?: string) =>
  provinces.find((p) => p.code === code)?.name || "";
const getDistrictName = (code?: string) =>
  districts.find((d) => d.code === code)?.name || "";
const getWardName = (code?: string) =>
  wards.find((w) => w.code === code)?.name || "";

// Map trạng thái
const orderStatusMap: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Trả hàng",
};

const orderStatusColors: Record<string, string> = {
  pending: "gold",
  confirmed: "blue",
  shipped: "cyan",
  delivered: "green",
  completed: "success",
  cancelled: "red",
  returned: "volcano",
};

const paymentStatusMap: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thất bại",
  pending: "Đang xử lý",
};

const paymentStatusColors: Record<string, string> = {
  unpaid: "default",
  paid: "green",
  refunded: "orange",
  failed: "red",
  pending: "gold",
};

const shippingStatusMap: Record<string, string> = {
  pending: "Chờ xử lý",
  in_transit: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  failed: "Giao thất bại",
  returned: "Đã hoàn hàng",
};

const paymentMethodMap: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPAY",
};

const paymentMethodColors: Record<string, string> = {
  cod: "red",
  vnpay: "green",
};


// Timeline steps
const getOrderSteps = (status: string) => {
  const allSteps = [
    { key: "pending", title: "Chờ xác nhận", icon: <ClockCircleOutlined /> },
    { key: "confirmed", title: "Đã xác nhận", icon: <CheckCircleOutlined /> },
    { key: "shipped", title: "Đang giao", icon: <TruckOutlined /> },
    { key: "delivered", title: "Đã giao", icon: <HomeOutlined /> },
    { key: "completed", title: "Hoàn thành", icon: <CheckCircleOutlined /> },
  ];

  const currentIndex = allSteps.findIndex((s) => s.key === status);
  
  return allSteps.map((step, index) => ({
    ...step,
    status: (index < currentIndex ? "finish" : index === currentIndex ? "process" : "wait") as "finish" | "process" | "wait",
  }));
};

const OrderUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      // Không cần truyền user_id nữa, API tự lấy từ token
      const res = await axios.get(`${API_URL}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrder(res.data.data);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải chi tiết đơn hàng!");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // In hóa đơn ra PDF
  const handlePrintPDF = async () => {
    if (!invoiceRef.current || !order) return;

    try {
      setPrinting(true);
      message.loading({ content: "Đang tạo hóa đơn PDF...", key: "print" });

      // Chụp nội dung thành canvas
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Tạo PDF
      const pdf = new jsPDF({
        orientation: imgHeight > pageHeight ? "portrait" : "portrait",
        unit: "mm",
        format: "a4",
      });

      let heightLeft = imgHeight;
      let position = 0;

      // Thêm trang đầu tiên
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Thêm các trang tiếp theo nếu nội dung dài
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Tải xuống PDF
      pdf.save(`Hoa-don-${order.sku}.pdf`);

      message.success({ content: "Tải hóa đơn PDF thành công!", key: "print" });
    } catch (error) {
      console.error(error);
      message.error({ content: "Không thể tạo hóa đơn PDF!", key: "print" });
    } finally {
      setPrinting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải chi tiết đơn hàng..." />
      </div>
    );
  }

  if (!order) return null;

  const s = order.shipping;
  const addressParts = [
    s?.notes ? s.notes.trim() : null,
    s?.village || null,
    getWardName(s?.commune),
    getDistrictName(s?.district),
    getProvinceName(s?.city),
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
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
                Chi tiết đơn hàng
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              size="large"
              onClick={handlePrintPDF}
              loading={printing}
            >
              Tải hóa đơn PDF
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Invoice Content - Phần này sẽ được export ra JPG */}
      <div ref={invoiceRef}>
        <Row gutter={[24, 24]}>
          {/* Cột trái */}
          <Col xs={24} lg={16}>
            {/* Thông tin đơn hàng */}
            <Card
              title={
                <Space>
                  <ShoppingOutlined />
                  <span>Thông tin đơn hàng</span>
                </Space>
              }
              style={{ marginBottom: 24, borderRadius: 8 }}
            >
              <Descriptions column={2} bordered>
                <Descriptions.Item label="Mã đơn hàng" span={2}>
                  <Text strong style={{ fontSize: 16, color: "#1890ff" }}>
                    {order.sku}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày đặt hàng" span={2}>
                  {formatDate(order.created_at)}
                </Descriptions.Item>
                <Descriptions.Item label="Hình thức thanh toán">
  <Tag color={paymentMethodColors[order.payment_method] || "default"}>
    {paymentMethodMap[order.payment_method] || order.payment_method}
  </Tag>
</Descriptions.Item>

                <Descriptions.Item label="Trạng thái đơn hàng">
                  <Tag color={orderStatusColors[order.status] || "default"}>
                    {orderStatusMap[order.status] || order.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Thanh toán">
                  <Tag color={paymentStatusColors[order.payment_status] || "default"}>
                    {paymentStatusMap[order.payment_status] || order.payment_status}
                  </Tag>
                </Descriptions.Item>
                {order.note && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    {order.note}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Chi tiết sản phẩm */}
            <Card
              title="Chi tiết sản phẩm"
              style={{ marginBottom: 24, borderRadius: 8 }}
            >
              {order.items.map((item, index) => (
                <div key={item.id}>
                  <Row gutter={16} align="middle">
                    <Col>
                      {item.product_image ? (
                        <img
                          src={`http://127.0.0.1:8000/${item.product_image}`}
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
                          <ShoppingOutlined style={{ fontSize: 32, color: "#ccc" }} />
                        </div>
                      )}
                    </Col>
                    <Col flex={1}>
                      <Text strong style={{ fontSize: 16, display: "block" }}>
                        {item.product_name}
                      </Text>
                      <Space size="large" style={{ marginTop: 8 }}>
                        {item.size && (
                          <Text type="secondary">Size: {item.size}</Text>
                        )}
                        {item.color && (
                          <Text type="secondary">Màu: {item.color}</Text>
                        )}
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">
                          {item.quantity} × {parseFloat(item.price).toLocaleString("vi-VN")}₫
                        </Text>
                      </div>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 16, color: "#52c41a" }}>
                        {item.total.toLocaleString("vi-VN")}₫
                      </Text>
                    </Col>
                  </Row>
                  {index < order.items.length - 1 && <Divider />}
                </div>
              ))}

              <Divider />
              
              {/* Tổng tiền */}
              <Row justify="end">
                <Col>
                  <Space direction="vertical" align="end" size="small">
                    <div>
                      <Text type="secondary">Tạm tính: </Text>
                      <Text strong style={{ fontSize: 16 }}>
                        {parseFloat(order.total_amount).toLocaleString("vi-VN")}₫
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Phí vận chuyển: </Text>
                      <Text strong style={{ fontSize: 16 }}>
                        0₫
                      </Text>
                    </div>
                    <Divider style={{ margin: "8px 0" }} />
                    <div>
                      <Text strong style={{ fontSize: 18 }}>Tổng cộng: </Text>
                      <Text strong style={{ fontSize: 20, color: "#ff4d4f" }}>
                        {parseFloat(order.final_amount).toLocaleString("vi-VN")}₫
                      </Text>
                    </div>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Thông tin vận chuyển */}
            <Card
              title="Thông tin vận chuyển"
              style={{ borderRadius: 8 }}
            >
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Mã vận đơn">
                  <Text strong>{s?.sku || "—"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Người nhận">
                  <Text strong>{s?.shipping_name || "—"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {s?.shipping_phone || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  {fullAddress || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái giao hàng">
                  <Tag color="blue">
                    {shippingStatusMap[s?.shipping_status] || s?.shipping_status || "—"}
                  </Tag>
                </Descriptions.Item>
                {s?.shipper_name && (
                  <>
                    <Descriptions.Item label="Người giao hàng">
                      {s.shipper_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="SĐT Shipper">
                      {s.shipper_phone || "—"}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>
          </Col>

          {/* Cột phải */}
          <Col xs={24} lg={8}>
            {/* Thông tin khách hàng */}
            <Card
              title="Thông tin khách hàng"
              style={{ marginBottom: 24, borderRadius: 8 }}
            >
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <div>
                  <Text type="secondary">Họ tên:</Text>
                  <br />
                  <Text strong style={{ fontSize: 16 }}>
                    {order.user?.name}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Số điện thoại:</Text>
                  <br />
                  <Text>{order.user?.phone}</Text>
                </div>
                <div>
                  <Text type="secondary">Email:</Text>
                  <br />
                  <Text>{order.user?.email}</Text>
                </div>
              </Space>
            </Card>

            {/* Tiến trình đơn hàng */}
            <Card title="Tiến trình đơn hàng" style={{ borderRadius: 8 }}>
              <Steps
                direction="vertical"
                current={
                  ["pending", "confirmed", "shipped", "delivered", "completed"].indexOf(
                    order.status
                  )
                }
                items={getOrderSteps(order.status)}
              />

              {(order.status === "cancelled" || order.status === "returned") && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: "#fff2e8", borderRadius: 8 }}>
                  <Text type="warning" strong>
                    {order.status === "cancelled" ? "⚠️ Đơn hàng đã bị hủy" : "⚠️ Đơn hàng đã được trả lại"}
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Footer info */}
      <Card style={{ marginTop: 24, textAlign: "center", borderRadius: 8 }}>
        <Text type="secondary">
          Cảm ơn bạn đã mua hàng! Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.
        </Text>
        <br />
        <Text type="secondary">
          Hotline: 1900-xxxx | Email: support@shop.com
        </Text>
      </Card>
    </div>
  );
};

export default OrderUserDetail;