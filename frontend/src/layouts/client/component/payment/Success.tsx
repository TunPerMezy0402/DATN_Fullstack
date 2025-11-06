import React, { useEffect, useState } from "react";
import {
  Result,
  Button,
  Card,
  Descriptions,
  Space,
  Typography,
  Spin,
  Tag,
  Alert,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ShoppingOutlined,
  HomeOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const API_URL = "http://127.0.0.1:8000/api";

const getToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

const formatMoney = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toLocaleString("vi-VN");
};

const RESPONSE_CODE_MESSAGES: Record<string, string> = {
  "00": "Giao dịch thành công",
  "07": "Trừ tiền thành công nhưng bị nghi ngờ lừa đảo hoặc bất thường.",
  "09": "Thẻ/Tài khoản chưa đăng ký Internet Banking.",
  "10": "Xác thực sai quá 3 lần.",
  "11": "Hết hạn chờ thanh toán.",
  "12": "Thẻ/Tài khoản bị khóa.",
  "13": "Sai OTP, vui lòng thử lại.",
  "24": "Khách hàng hủy giao dịch.",
  "51": "Tài khoản không đủ số dư.",
  "65": "Vượt quá hạn mức giao dịch trong ngày.",
  "75": "Ngân hàng đang bảo trì.",
  "79": "Sai mật khẩu thanh toán quá số lần quy định.",
  "99": "Lỗi khác hoặc không xác định.",
};

interface OrderStatus {
  order_id: string | number;
  payment_status: string;
  status: string;
  final_amount: number;
  paid_at?: string;
  transaction?: {
    id: number;
    transaction_code: string;
    status: string;
    amount: number;
    payment_method: string;
    bank_code?: string;
    paid_at?: string;
  };
}

const PaymentSuccessPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [vnpayData, setVnpayData] = useState<Record<string, string>>({});

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const responseCode = searchParams.get("vnp_ResponseCode");
    const txnRef = searchParams.get("vnp_TxnRef") || "";
    const amount = searchParams.get("vnp_Amount");
    const orderInfo = searchParams.get("vnp_OrderInfo");
    const transactionNo = searchParams.get("vnp_TransactionNo");
    const bankCode = searchParams.get("vnp_BankCode");

    // Lưu dữ liệu VNPay
    setVnpayData({
      responseCode: responseCode || "",
      txnRef,
      amount: amount || "",
      orderInfo: orderInfo || "",
      transactionNo: transactionNo || "",
      bankCode: bankCode || "",
    });

    // 🔧 Sửa lỗi: Tách orderId đúng (tránh "_xxxx")
    const orderId =
      txnRef.split("_")[0] ||
      searchParams.get("order_id") ||
      localStorage.getItem("pending_order_id");

    if (orderId) {
      checkOrderStatus(orderId);
      localStorage.removeItem("pending_order_id");
      localStorage.removeItem("selectedCartItems");
    } else {
      setLoading(false);
    }
  }, []);

  const checkOrderStatus = async (orderId: string) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/payment-status`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        console.warn("API trả về lỗi:", res.status);
        setOrderStatus(null);
        return;
      }

      const json = await res.json();

      if (json.success && json.data) {
        setOrderStatus(json.data);
      } else {
        console.warn("Dữ liệu không hợp lệ:", json);
      }
    } catch (err) {
      console.error("Error checking order status:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          background: "#f5f5f5",
        }}
      >
        {/* 🟢 Sửa lỗi Spin tip warning */}
        <Spin spinning tip="Đang kiểm tra trạng thái thanh toán..." size="large">
          <div style={{ height: 100 }} />
        </Spin>
      </div>
    );
  }

  const isVNPaySuccess = vnpayData.responseCode === "00";
  const isCODSuccess =
    !vnpayData.responseCode && orderStatus?.payment_status === "unpaid";
  const isSuccess = isVNPaySuccess || isCODSuccess;

  const getStatusIcon = () => {
    if (isSuccess) return <CheckCircleOutlined />;
    if (vnpayData.responseCode === "24") return <ClockCircleOutlined />;
    return <CloseCircleOutlined />;
  };

  const getStatusType = () => {
    if (isSuccess) return "success";
    if (vnpayData.responseCode === "24") return "warning";
    return "error";
  };

  const getTitle = () => {
    if (isCODSuccess) return "Đặt hàng thành công!";
    if (isVNPaySuccess) return "Thanh toán thành công!";
    if (vnpayData.responseCode === "24") return "Đã hủy thanh toán";
    return "Thanh toán thất bại";
  };

  const getSubTitle = () => {
    if (isCODSuccess)
      return "Đơn hàng của bạn đã được tiếp nhận. Bạn sẽ thanh toán khi nhận hàng.";
    if (isVNPaySuccess)
      return "Giao dịch của bạn đã được xử lý thành công.";
    if (vnpayData.responseCode === "24")
      return "Bạn đã hủy thanh toán. Vui lòng thử lại nếu muốn tiếp tục.";
    return (
      RESPONSE_CODE_MESSAGES[vnpayData.responseCode] ||
      "Đã có lỗi xảy ra trong quá trình thanh toán."
    );
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "48px 16px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Result
          status={getStatusType()}
          icon={getStatusIcon()}
          title={<Title level={2}>{getTitle()}</Title>}
          subTitle={getSubTitle()}
          extra={[
            <Button
              type="primary"
              size="large"
              icon={<ShoppingOutlined />}
              onClick={() => (window.location.href = "/orders")}
              key="orders"
            >
              Xem đơn hàng
            </Button>,
            <Button
              size="large"
              icon={<HomeOutlined />}
              onClick={() => (window.location.href = "/")}
              key="home"
            >
              Về trang chủ
            </Button>,
          ]}
        />

        {orderStatus && (
          <Card
            title={
              <Space>
                <ShoppingOutlined />
                <span>Thông tin đơn hàng</span>
              </Space>
            }
            style={{ marginTop: 24 }}
          >
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Mã đơn hàng">
                <Text strong>#{orderStatus.order_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái đơn hàng">
                <Tag color={orderStatus.status === "confirmed" ? "green" : "blue"}>
                  {orderStatus.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái thanh toán">
                <Tag
                  color={
                    orderStatus.payment_status === "paid"
                      ? "success"
                      : orderStatus.payment_status === "pending"
                      ? "processing"
                      : orderStatus.payment_status === "failed"
                      ? "error"
                      : "default"
                  }
                >
                  {orderStatus.payment_status === "paid"
                    ? "Đã thanh toán"
                    : orderStatus.payment_status === "pending"
                    ? "Đang xử lý"
                    : orderStatus.payment_status === "failed"
                    ? "Thất bại"
                    : "Chưa thanh toán"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <Text strong style={{ fontSize: 16, color: "#ff4d4f" }}>
                  {formatMoney(orderStatus.final_amount)}₫
                </Text>
              </Descriptions.Item>
              {orderStatus.paid_at && (
                <Descriptions.Item label="Thời gian thanh toán">
                  {new Date(orderStatus.paid_at).toLocaleString("vi-VN")}
                </Descriptions.Item>
              )}
              {orderStatus.transaction && (
                <>
                  <Descriptions.Item label="Mã giao dịch">
                    <Text code>{orderStatus.transaction.transaction_code}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phương thức">
                    <Tag color="blue">
                      {orderStatus.transaction.payment_method === "vnpay"
                        ? "VNPay"
                        : "COD"}
                    </Tag>
                  </Descriptions.Item>
                  {orderStatus.transaction.bank_code && (
                    <Descriptions.Item label="Ngân hàng">
                      {orderStatus.transaction.bank_code}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Trạng thái giao dịch">
                    <Tag
                      color={
                        orderStatus.transaction.status === "success"
                          ? "success"
                          : orderStatus.transaction.status === "pending"
                          ? "processing"
                          : "error"
                      }
                    >
                      {orderStatus.transaction.status === "success"
                        ? "Thành công"
                        : orderStatus.transaction.status === "pending"
                        ? "Đang xử lý"
                        : "Thất bại"}
                    </Tag>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        )}

        {vnpayData.transactionNo && (
          <Card title="Chi tiết giao dịch VNPay" style={{ marginTop: 16 }} size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Mã giao dịch">
                {vnpayData.transactionNo}
              </Descriptions.Item>
              <Descriptions.Item label="Ngân hàng">
                {vnpayData.bankCode}
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">
                {formatMoney(Number(vnpayData.amount) / 100)}₫
              </Descriptions.Item>
              <Descriptions.Item label="Mã phản hồi">
                {vnpayData.responseCode}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {!isSuccess && vnpayData.responseCode && (
          <Alert
            message="Lưu ý"
            description={
              <Space direction="vertical">
                <Text>
                  Nếu tiền đã bị trừ nhưng giao dịch thất bại, số tiền sẽ được hoàn lại trong
                  1–3 ngày làm việc.
                </Text>
                <Text>
                  Nếu có thắc mắc, vui lòng liên hệ hotline: <Text strong>1900-xxxx</Text>
                </Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
