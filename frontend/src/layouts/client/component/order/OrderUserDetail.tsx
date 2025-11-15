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
  SyncOutlined,
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
  reason: string;
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

const paymentStatusMap: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refund_processing: "Đang hoàn tiền",
  refunded: "Đã hoàn tiền",
  failed: "Thanh toán thất bại",
};

const shippingStatusMap: Record<string, string> = {
  pending: "Chờ xử lý",
  in_transit: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  failed: "Giao thất bại",
  returned: "Đã hoàn hàng",
  none: "Đã hủy",
  nodone: "Chưa thanh toán",
};

const paymentMethodMap: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPAY",
};

const paymentMethodColors: Record<string, string> = {
  cod: "orange",
  vnpay: "green",
};

const paymentStatusColors: Record<string, string> = {
  unpaid: "orange",
  paid: "green",
  refund_processing: "purple",
  refunded: "blue",
  failed: "red",
};

const shippingStatusColors: Record<string, string> = {
  pending: "orange",
  in_transit: "blue",
  delivered: "green",
  failed: "red",
  returned: "purple",
  none: "default",
  nodone: "yellow",
};

// Timeline steps cho shipping_status
const getShippingSteps = (shippingStatus: string) => {
  const allSteps = [
    { key: "pending", title: "Chờ xử lý", icon: <ClockCircleOutlined /> },
    { key: "in_transit", title: "Đang vận chuyển", icon: <TruckOutlined /> },
    { key: "delivered", title: "Đã giao hàng", icon: <HomeOutlined /> },
  ];

  const statusIndex = allSteps.findIndex((s) => s.key === shippingStatus);

  return allSteps.map((step, index) => ({
    ...step,
    status: (index < statusIndex 
      ? "finish" 
      : index === statusIndex 
        ? "process" 
        : "wait") as "finish" | "process" | "wait",
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
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returning, setReturning] = useState(false);
  const [repaying, setRepaying] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get(`${API_URL}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const orderData = res.data.data;
      setOrder(orderData);
      
      // Thông báo khi đơn hàng chuyển sang trạng thái đang vận chuyển
      if (orderData.shipping?.shipping_status === "in_transit") {
        message.info({
          content: "📦 Đơn hàng của bạn đã được vận chuyển!",
          duration: 5,
        });
      }
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

  // Kiểm tra có thể hủy đơn hàng không (chỉ hủy được khi đang pending)
  const canCancelOrder = (shippingStatus: string) => {
    return shippingStatus === "pending" || shippingStatus === "nodone"  ;
  };

  // Kiểm tra có thể hoàn hàng không (chỉ hoàn được khi đã delivered)
  const canReturnOrder = (shippingStatus: string) => {
    return shippingStatus === "delivered";
  };

  // Kiểm tra có thể thanh toán lại không (vnpay và thanh toán thất bại, và chưa bị hủy)
  const canRepay = (paymentMethod: string, paymentStatus: string, shippingStatus: string) => {
    return paymentMethod === "vnpay" && 
           (paymentStatus === "unpaid" || paymentStatus === "failed") &&
           shippingStatus !== "none";
  };

  // Xử lý hủy đơn hàng
  // Xử lý hủy đơn hàng
const handleCancelOrder = async () => {
  if (!cancelReason.trim()) {
    message.warning("Vui lòng nhập lý do hủy đơn!");
    return;
  }

  try {
    setCancelling(true);
    const token = getAuthToken();
    
    // Kiểm tra lại trạng thái mới nhất trước khi hủy
    const checkRes = await axios.get(`${API_URL}/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const latestStatus = checkRes.data.data.shipping?.shipping_status;
    
    // ✅ FIX: Sử dụng && và !includes thay vì ||
    if (!["pending", "nodone"].includes(latestStatus)) {
      setCancelModalVisible(false);
      setCancelReason("");
      
      if (latestStatus === "in_transit") {
        message.warning({
          content: "📦 Đơn hàng của bạn đã được vận chuyển! Không thể hủy đơn hàng.",
          duration: 5,
        });
      } else if (latestStatus === "delivered") {
        message.warning({
          content: "✅ Đơn hàng của bạn đã được giao! Không thể hủy đơn hàng.",
          duration: 5,
        });
      } else if (latestStatus === "none") {
        message.info({
          content: "Đơn hàng này đã được hủy trước đó.",
          duration: 5,
        });
      } else {
        message.warning({
          content: "Đơn hàng đã thay đổi trạng thái! Không thể hủy đơn hàng.",
          duration: 5,
        });
      }
      
      // Cập nhật lại UI với trạng thái mới
      setOrder(checkRes.data.data);
      return;
    }

    // Nếu vẫn còn pending hoặc nodone thì tiếp tục hủy
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

  // Xử lý hoàn hàng
  const handleReturnOrder = async () => {
    if (!returnReason.trim()) {
      message.warning("Vui lòng nhập lý do hoàn hàng!");
      return;
    }

    try {
      setReturning(true);
      const token = getAuthToken();
      
      // Kiểm tra lại trạng thái mới nhất trước khi hoàn hàng
      const checkRes = await axios.get(`${API_URL}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const latestStatus = checkRes.data.data.shipping?.shipping_status;
      
      // Nếu đơn hàng không còn ở trạng thái delivered
      if (latestStatus !== "delivered") {
        setReturnModalVisible(false);
        setReturnReason("");
        
        if (latestStatus === "returned") {
          message.info({
            content: "Đơn hàng này đã được hoàn trả trước đó.",
            duration: 5,
          });
        } else {
          message.warning({
            content: "Trạng thái đơn hàng đã thay đổi! Không thể tạo yêu cầu hoàn hàng.",
            duration: 5,
          });
        }
        
        // Cập nhật lại UI với trạng thái mới
        setOrder(checkRes.data.data);
        return;
      }

      // Nếu vẫn còn delivered thì tiếp tục hoàn hàng
      await axios.post(
        `${API_URL}/orders/${id}/return`,
        { reason: returnReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success("Yêu cầu hoàn hàng đã được gửi thành công!");
      setReturnModalVisible(false);
      setReturnReason("");
      fetchOrder();
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || "Không thể tạo yêu cầu hoàn hàng!");
    } finally {
      setReturning(false);
    }
  };

  // Xử lý thanh toán lại
  const handleRepay = async () => {
    try {
      setRepaying(true);
      const token = getAuthToken();
      
      // Gọi API để tạo lại link thanh toán VNPAY
      const res = await axios.post(
        `${API_URL}/orders/${id}/repay`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Chuyển hướng đến trang thanh toán VNPAY
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        message.error("Không thể tạo link thanh toán!");
      }
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || "Không thể thanh toán lại!");
      setRepaying(false);
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
              {canRepay(order.payment_method, order.payment_status, s?.shipping_status) && (
                <Button
                  type="primary"
                  icon={<ShoppingOutlined />}
                  size="large"
                  onClick={handleRepay}
                  loading={repaying}
                  style={{
                    height: 45,
                    fontSize: 16,
                    fontWeight: 500,
                    backgroundColor: "#1890ff",
                    borderColor: "#1890ff",
                  }}
                >
                  Thanh toán lại
                </Button>
              )}
              {canReturnOrder(s?.shipping_status) && (
                <Button
                  icon={<SyncOutlined />}
                  size="large"
                  onClick={() => setReturnModalVisible(true)}
                  style={{
                    height: 45,
                    fontSize: 16,
                    fontWeight: 500,
                    backgroundColor: "#722ed1",
                    color: "white",
                    borderColor: "#722ed1",
                  }}
                >
                  Hoàn hàng
                </Button>
              )}
              {canCancelOrder(s?.shipping_status) && (
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
                {/* Ngày đặt hàng */}
                <Descriptions.Item label="Ngày đặt hàng" span={2}>
                  <Text strong>{formatDate(order.created_at)}</Text>
                </Descriptions.Item>

                {/* Trạng thái giao hàng */}
                <Descriptions.Item label="Trạng thái giao hàng" span={2}>
                  <Tag
                    color={shippingStatusColors[s?.shipping_status] || "default"}
                    icon={
                      s?.shipping_status === "in_transit" ? <SyncOutlined spin /> : 
                      s?.shipping_status === "delivered" ? <CheckCircleOutlined /> :
                      s?.shipping_status === "failed" ? <CloseCircleOutlined /> :
                      s?.shipping_status === "returned" ? <CloseCircleOutlined /> :
                      <ClockCircleOutlined />
                    }
                    style={{ fontSize: 14, padding: "6px 14px", fontWeight: 500 }}
                  >
                    {shippingStatusMap[s?.shipping_status] || s?.shipping_status || "—"}
                  </Tag>
                </Descriptions.Item>

                {/* Trạng thái thanh toán */}
                <Descriptions.Item label="Trạng thái thanh toán">
                  <Space>
                    <Tag
                      color={paymentStatusColors[order.payment_status] || "default"}
                      style={{ fontSize: 14, padding: "4px 12px", fontWeight: 500 }}
                    >
                      {paymentStatusMap[order.payment_status] || order.payment_status}
                    </Tag>
                  </Space>
                </Descriptions.Item>

                {/* Hình thức thanh toán */}
                <Descriptions.Item label="Hình thức thanh toán">
                  <Tag
                    color={paymentMethodColors[order.payment_method] || "default"}
                    style={{ fontSize: 14, padding: "4px 12px", fontWeight: 500 }}
                  >
                    {paymentMethodMap[order.payment_method] || order.payment_method}
                  </Tag>
                </Descriptions.Item>

                {/* Ghi chú (nếu có) */}
                {order.note && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    <Paragraph style={{ margin: 0 }}>
                      {order.note}
                    </Paragraph>
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
                <span style={{ fontSize: 18, fontWeight: 600 }}>Tiến trình vận chuyển</span>
              }
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {s?.shipping_status === "none" ? (
                <div style={{
                  padding: 20,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 8,
                  border: "1px solid #d9d9d9",
                  textAlign: "center",
                }}>
                  <Space direction="vertical" size="middle">
                    <CloseCircleOutlined style={{ color: "#8c8c8c", fontSize: 48 }} />
                    <div>
                      <Text strong style={{ color: "#595959", fontSize: 16, display: "block", marginBottom: 8 }}>
                        Đơn hàng đã bị hủy
                      </Text>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        Đơn hàng này đã được hủy bởi người dùng.
                      </Text>
                    </div>
                  </Space>
                </div>
              ) : (s?.shipping_status === "failed" || s?.shipping_status === "returned") ? (
                <div style={{
                  padding: 20,
                  backgroundColor: "#fff2e8",
                  borderRadius: 8,
                  border: "1px solid #ffbb96",
                  textAlign: "center",
                }}>
                  <Space direction="vertical" size="middle">
                    <ExclamationCircleOutlined style={{ color: "#ff7a45", fontSize: 48 }} />
                    <div>
                      <Text strong style={{ color: "#d4380d", fontSize: 16, display: "block", marginBottom: 8 }}>
                        {s?.shipping_status === "failed" ? "Giao hàng thất bại" : "Đơn hàng đã được hoàn lại"}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        {s?.shipping_status === "failed" 
                          ? "Không thể giao hàng đến địa chỉ của bạn. Vui lòng liên hệ với chúng tôi để được hỗ trợ."
                          : "Đơn hàng đã được trả lại cho người bán."}
                      </Text>
                    </div>
                  </Space>
                </div>
              ) : (
                <Steps
                  direction="vertical"
                  current={
                    ["pending", "in_transit", "delivered"].indexOf(
                      s?.shipping_status
                    )
                  }
                  items={getShippingSteps(s?.shipping_status)}
                />
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
      {/* Modal hoàn hàng */}
      <Modal
        title={
          <Space>
            <SyncOutlined style={{ color: "#722ed1", fontSize: 24 }} />
            <span style={{ fontSize: 18 }}>Yêu cầu hoàn hàng</span>
          </Space>
        }
        open={returnModalVisible}
        onCancel={() => {
          setReturnModalVisible(false);
          setReturnReason("");
        }}
        footer={[
          <Button
            key="back"
            onClick={() => {
              setReturnModalVisible(false);
              setReturnReason("");
            }}
            size="large"
          >
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={returning}
            onClick={handleReturnOrder}
            icon={<SyncOutlined />}
            size="large"
            style={{
              backgroundColor: "#722ed1",
              borderColor: "#722ed1",
            }}
          >
            Xác nhận hoàn hàng
          </Button>,
        ]}
        width={600}
      >
        <Divider style={{ margin: "16px 0" }} />
        <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
          Bạn muốn hoàn trả đơn hàng <Text strong style={{ color: "#1890ff" }}>{order.sku}</Text>?
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 20 }}>
          ℹ️ Lưu ý: Yêu cầu hoàn hàng sẽ được xem xét và xử lý trong vòng 24-48 giờ.
        </Paragraph>
        <TextArea
          placeholder="Vui lòng nhập lý do hoàn hàng (sản phẩm bị lỗi, không đúng mô tả, v.v.)..."
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
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