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
  Tag,
  Divider,
  Steps,
  Modal,
  Input,
} from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  HomeOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { provinces, districts, wards } from "vietnam-provinces";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

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
  cod: "orange",
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
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
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

  // Kiểm tra có thể hủy đơn hàng không
  const canCancelOrder = (status: string) => {
    const nonCancellableStatuses = ["shipped", "delivered", "completed", "cancelled", "returned"];
    return !nonCancellableStatuses.includes(status);
  };

  // Xử lý hủy đơn hàng
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      message.warning("Vui lòng nhập lý do hủy đơn!");
      return;
    }

    try {
      setCancelling(true);
      const token = getAuthToken();
      await axios.post(
        `${API_URL}/orders/${id}/cancel`,
        { reason: cancelReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success("Hủy đơn hàng thành công!");
      setCancelModalVisible(false);
      setCancelReason("");
      fetchOrder();
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || "Không thể hủy đơn hàng!");
    } finally {
      setCancelling(false);
    }
  };

  // In hóa đơn ra PDF
  const handlePrintPDF = async () => {
    if (!invoiceRef.current || !order) return;

    try {
      setPrinting(true);
      message.loading({ content: "Đang tạo hóa đơn PDF...", key: "print" });

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

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

  // Tính toán phí ship và giảm giá
  const shippingFee = 30000;
  const totalAmount = parseFloat(order.total_amount);
  const finalAmount = parseFloat(order.final_amount);
  const freeShippingThreshold = 500000;
  const isFreeShipping = totalAmount >= freeShippingThreshold;
  
  let couponDiscount = 0;
  if (isFreeShipping) {
    couponDiscount = totalAmount - finalAmount;
  } else {
    couponDiscount = totalAmount + shippingFee - finalAmount;
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header với gradient */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 12,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
        }}
        bodyStyle={{ padding: "24px" }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/orders")}
                size="large"
                style={{ 
                  backgroundColor: "rgba(255,255,255,0.2)", 
                  border: "none",
                  color: "white",
                }}
              >
                Quay lại
              </Button>
              <div>
                <Title level={3} style={{ margin: 0, color: "white" }}>
                  Chi tiết đơn hàng
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16 }}>
                  Mã đơn: <strong>{order.sku}</strong>
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              {canCancelOrder(order.status) && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  size="large"
                  onClick={() => setCancelModalVisible(true)}
                  style={{ 
                    height: 45,
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  Hủy đơn hàng
                </Button>
              )}
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                size="large"
                onClick={handlePrintPDF}
                loading={printing}
                style={{ 
                  backgroundColor: "#52c41a",
                  borderColor: "#52c41a",
                  height: 45,
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                Tải hóa đơn PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Invoice Content */}
      <div ref={invoiceRef}>
        <Row gutter={[24, 24]}>
          {/* Cột trái */}
          <Col xs={24} lg={16}>
            {/* Thông tin đơn hàng */}
            <Card
              title={
                <Space>
                  <ShoppingOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                  <span style={{ fontSize: 18, fontWeight: 600 }}>Thông tin đơn hàng</span>
                </Space>
              }
              style={{ 
                marginBottom: 24, 
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Descriptions column={{ xs: 1, sm: 2 }} bordered>
                <Descriptions.Item label="Ngày đặt hàng" span={2}>
                  <Text strong>{formatDate(order.created_at)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái đơn hàng">
                  <Tag 
                    color={orderStatusColors[order.status] || "default"}
                    style={{ fontSize: 14, padding: "4px 12px", fontWeight: 500 }}
                  >
                    {orderStatusMap[order.status] || order.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hình thức thanh toán">
                  <Tag 
                    color={paymentMethodColors[order.payment_method] || "default"}
                    style={{ fontSize: 14, padding: "4px 12px", fontWeight: 500 }}
                  >
                    {paymentMethodMap[order.payment_method] || order.payment_method}
                  </Tag>
                </Descriptions.Item>
                {order.note && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    <Paragraph style={{ margin: 0 }}>{order.note}</Paragraph>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Chi tiết sản phẩm */}
            <Card
              title={
                <span style={{ fontSize: 18, fontWeight: 600 }}>Chi tiết sản phẩm</span>
              }
              style={{ 
                marginBottom: 24, 
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
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
                            width: 90,
                            height: 90,
                            objectFit: "cover",
                            borderRadius: 12,
                            border: "2px solid #f0f0f0",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 90,
                            height: 90,
                            backgroundColor: "#f5f5f5",
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ShoppingOutlined style={{ fontSize: 36, color: "#ccc" }} />
                        </div>
                      )}
                    </Col>
                    <Col flex={1}>
                      <Text strong style={{ fontSize: 17, display: "block", marginBottom: 8 }}>
                        {item.product_name}
                      </Text>
                      <Space size="large">
                        {item.size && (
                          <Tag color="blue">Size: {item.size}</Tag>
                        )}
                        {item.color && (
                          <Tag color="purple">Màu: {item.color}</Tag>
                        )}
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 15 }}>
                          Số lượng: <strong>{item.quantity}</strong> × {parseFloat(item.price).toLocaleString("vi-VN")}₫
                        </Text>
                      </div>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 18, color: "#ff4d4f" }}>
                        {item.total.toLocaleString("vi-VN")}₫
                      </Text>
                    </Col>
                  </Row>
                  {index < order.items.length - 1 && <Divider />}
                </div>
              ))}

              <Divider style={{ margin: "24px 0", borderColor: "#d9d9d9" }} />
              
              {/* Tổng tiền */}
              <div style={{ backgroundColor: "#fafafa", padding: 20, borderRadius: 8 }}>
                <Row justify="end">
                  <Col>
                    <Space direction="vertical" align="end" size="middle" style={{ width: "100%" }}>
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                        <Text style={{ fontSize: 16 }}>Tạm tính:</Text>
                        <Text strong style={{ fontSize: 16 }}>
                          {totalAmount.toLocaleString("vi-VN")}₫
                        </Text>
                      </div>
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                        <Text style={{ fontSize: 16 }}>Phí vận chuyển:</Text>
                        {isFreeShipping ? (
                          <Text strong style={{ fontSize: 16, color: "#52c41a" }}>
                            Miễn phí
                          </Text>
                        ) : (
                          <Text strong style={{ fontSize: 16 }}>
                            {shippingFee.toLocaleString("vi-VN")}₫
                          </Text>
                        )}
                      </div>
                      {couponDiscount > 0 && (
                        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                          <Text style={{ fontSize: 16 }}>Mã giảm giá:</Text>
                          <Text strong style={{ fontSize: 16, color: "#ff4d4f" }}>
                            - {couponDiscount.toLocaleString("vi-VN")}₫
                          </Text>
                        </div>
                      )}
                      <Divider style={{ margin: "8px 0" }} />
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                        <Text strong style={{ fontSize: 20 }}>Tổng cộng:</Text>
                        <Text strong style={{ fontSize: 24, color: "#ff4d4f" }}>
                          {finalAmount.toLocaleString("vi-VN")}₫
                        </Text>
                      </div>
                    </Space>
                  </Col>
                </Row>
              </div>
            </Card>

            {/* Thông tin vận chuyển */}
            <Card
              title={
                <Space>
                  <TruckOutlined style={{ fontSize: 20, color: "#52c41a" }} />
                  <span style={{ fontSize: 18, fontWeight: 600 }}>Thông tin vận chuyển</span>
                </Space>
              }
              style={{ 
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Mã vận đơn">
                  <Text strong style={{ fontSize: 15 }}>{s?.sku || "—"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Người nhận">
                  <Text strong style={{ fontSize: 15 }}>{s?.shipping_name || "—"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  <Text style={{ fontSize: 15 }}>{s?.shipping_phone || "—"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  <Text style={{ fontSize: 15 }}>{fullAddress || "—"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái giao hàng">
                  <Tag color="cyan" style={{ fontSize: 14, padding: "4px 12px" }}>
                    {shippingStatusMap[s?.shipping_status] || s?.shipping_status || "—"}
                  </Tag>
                </Descriptions.Item>
                {s?.shipper_name && (
                  <>
                    <Descriptions.Item label="Người giao hàng">
                      <Text style={{ fontSize: 15 }}>{s.shipper_name}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="SĐT Shipper">
                      <Text style={{ fontSize: 15 }}>{s.shipper_phone || "—"}</Text>
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
              title={
                <span style={{ fontSize: 18, fontWeight: 600 }}>Thông tin khách hàng</span>
              }
              style={{ 
                marginBottom: 24, 
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>Họ tên</Text>
                  <br />
                  <Text strong style={{ fontSize: 17 }}>
                    {order.user?.name}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>Số điện thoại</Text>
                  <br />
                  <Text style={{ fontSize: 16 }}>{order.user?.phone}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 14 }}>Email</Text>
                  <br />
                  <Text style={{ fontSize: 16 }}>{order.user?.email}</Text>
                </div>
              </Space>
            </Card>

            {/* Tiến trình đơn hàng */}
            <Card 
              title={
                <span style={{ fontSize: 18, fontWeight: 600 }}>Tiến trình đơn hàng</span>
              }
              style={{ 
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
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
                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  backgroundColor: "#fff2e8", 
                  borderRadius: 8,
                  border: "1px solid #ffbb96",
                }}>
                  <Space>
                    <ExclamationCircleOutlined style={{ color: "#ff7a45", fontSize: 18 }} />
                    <Text strong style={{ color: "#d4380d", fontSize: 15 }}>
                      {order.status === "cancelled" ? "Đơn hàng đã bị hủy" : "Đơn hàng đã được trả lại"}
                    </Text>
                  </Space>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Footer info */}
      <Card 
        style={{ 
          marginTop: 24, 
          textAlign: "center", 
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          backgroundColor: "#fafafa",
        }}
      >
        <Space direction="vertical" size="small">
          <Text style={{ fontSize: 16 }}>
            🎉 Cảm ơn bạn đã mua hàng!
          </Text>
          <Text type="secondary" style={{ fontSize: 15 }}>
            Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi
          </Text>
          <Divider style={{ margin: "12px 0" }} />
          <Space split={<Divider type="vertical" />}>
            <Text strong style={{ fontSize: 15 }}>📞 Hotline: 1900-xxxx</Text>
            <Text strong style={{ fontSize: 15 }}>✉️ Email: support@shop.com</Text>
          </Space>
        </Space>
      </Card>

      {/* Modal hủy đơn hàng */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#ff4d4f", fontSize: 24 }} />
            <span style={{ fontSize: 18 }}>Xác nhận hủy đơn hàng</span>
          </Space>
        }
        open={cancelModalVisible}
        onCancel={() => {
          setCancelModalVisible(false);
          setCancelReason("");
        }}
        footer={[
          <Button 
            key="back" 
            onClick={() => {
              setCancelModalVisible(false);
              setCancelReason("");
            }}
            size="large"
          >
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={cancelling}
            onClick={handleCancelOrder}
            icon={<CloseCircleOutlined />}
            size="large"
          >
            Xác nhận hủy
          </Button>,
        ]}
        width={600}
      >
        <Divider style={{ margin: "16px 0" }} />
        <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
          Bạn có chắc chắn muốn hủy đơn hàng <Text strong style={{ color: "#1890ff" }}>{order.sku}</Text>?
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 20 }}>
          ⚠️ Lưu ý: Sau khi hủy, đơn hàng sẽ không thể khôi phục.
        </Paragraph>
        <TextArea
          placeholder="Vui lòng nhập lý do hủy đơn hàng..."
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={4}
          maxLength={500}
          showCount
          style={{ fontSize: 15 }}
        />
      </Modal>
    </div>
  );
};

export default OrderUserDetail;