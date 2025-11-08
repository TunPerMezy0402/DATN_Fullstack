import React, { useEffect, useState, useMemo } from "react";
import {
  Steps,
  Form,
  Input,
  Button,
  Radio,
  Typography,
  Divider,
  message,
  Card,
  Space,
  Spin,
  Image,
  Row,
  Col,
  Modal,
  List,
  Tag,
  Badge,
  Alert,
} from "antd";
import {
  GiftOutlined,
  EnvironmentOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  WarningOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

// ==================== CONFIG ====================
const API_URL = "http://127.0.0.1:8000/api";
const IMAGE_BASE_URL = "http://127.0.0.1:8000/";
const FREE_SHIPPING_THRESHOLD = 500000;
const STANDARD_SHIPPING_FEE = 30000;
const VNPAY_MIN = 10000;
const VNPAY_MAX = 500000000;

// ==================== TYPES ====================
interface CartItem {
  id?: number;
  quantity: number;
  variant: {
    id?: number;
    image?: string;
    price?: number;
    discount_price?: number;
    stock_quantity?: number;
    sku?: string;
    product?: { id?: number; name?: string };
    color?: { value?: string };
    size?: { value?: string };
  };
}

interface Address {
  id: number;
  recipient_name: string;
  phone: string;
  village?: string;
  commune?: string;
  district?: string;
  city?: string;
  notes?: string;
  is_default?: boolean;
}

interface Coupon {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_purchase: number;
  max_discount: number;
  end_date?: string;
  is_active: boolean | number;
  used?: boolean;
}

// ==================== UTILS ====================
const getToken = () => localStorage.getItem("access_token") || localStorage.getItem("token");

const formatMoney = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toLocaleString("vi-VN");
};

const getPrice = (variant: CartItem["variant"]) => 
  Number(variant.discount_price ?? variant.price ?? 0);

const isCouponValid = (coupon: Coupon, subtotal: number) => {
  if (!coupon.is_active || coupon.used) return false;
  if (coupon.end_date && new Date(coupon.end_date) < new Date()) return false;
  if (subtotal < coupon.min_purchase) return false;
  return true;
};

const calcDiscount = (coupon: Coupon, subtotal: number) => {
  if (coupon.discount_type === "percent") {
    return Math.min(
      Math.round((coupon.discount_value / 100) * subtotal),
      coupon.max_discount
    );
  }
  return Math.min(coupon.discount_value, coupon.max_discount);
};

const validateVNPay = (amount: number) => {
  if (amount < VNPAY_MIN) return `Số tiền tối thiểu ${formatMoney(VNPAY_MIN)}₫`;
  if (amount > VNPAY_MAX) return `Số tiền tối đa ${formatMoney(VNPAY_MAX)}₫`;
  return null;
};

const generateSKU = () =>
  Array.from({ length: 9 }, () => 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
  ).join("");

// ==================== API HELPERS ====================
const api = {
  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async post(endpoint: string, data: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || `HTTP ${res.status}`);
    }
    return res.json();
  },
};

// ==================== MAIN COMPONENT ====================
const CheckoutPage: React.FC = () => {
  // State
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();

  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<Address | null>(null);
  const [user, setUser] = useState<any>(null);

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponModal, setCouponModal] = useState(false);

  const [payment, setPayment] = useState<string>("cod");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Computed
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + getPrice(item.variant) * item.quantity, 0),
    [items]
  );

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;

  const discount = useMemo(() => {
    if (!coupon || !isCouponValid(coupon, subtotal)) return 0;
    return calcDiscount(coupon, subtotal);
  }, [coupon, subtotal]);

  const total = Math.max(0, subtotal - discount + shipping);
  const vnpayError = validateVNPay(total);

  // Load data
  useEffect(() => {
    const loadItems = () => {
      try {
        const data = JSON.parse(localStorage.getItem("selectedCartItems") || "[]");
        setItems(data);
      } catch (err) {
        message.error("Không thể tải giỏ hàng");
      }
    };

    const fetchProfile = async () => {
      try {
        const json = await api.get("/profile");
        const data = json.user || json;
        setUser(data);
        setAddresses(json.addresses || []);
        
        const defaultAddr = (json.addresses || []).find((a: Address) => a.is_default);
        if (defaultAddr) setSelectedAddr(defaultAddr);
      } catch (err) {
        message.error("Không thể tải thông tin");
      } finally {
        setLoading(false);
      }
    };

    const fetchCoupons = async () => {
      try {
        const json = await api.get("/admin/coupons");
        const all = json?.data || json || [];
        setCoupons(all.filter((c: Coupon) => c.is_active));
      } catch (err) {
        console.error("Error loading coupons:", err);
      }
    };

    loadItems();
    fetchProfile();
    fetchCoupons();
  }, []);

  // Auto-switch from VNPay if invalid
  useEffect(() => {
    if (payment === "vnpay" && vnpayError) {
      message.warning(vnpayError);
      setPayment("cod");
      payForm.setFieldsValue({ payment: "cod" });
    }
  }, [payment, vnpayError, payForm]);

  // Handlers
  const selectCoupon = (cp: Coupon) => {
    if (!isCouponValid(cp, subtotal)) {
      if (subtotal < cp.min_purchase) {
        message.error(`Đơn tối thiểu ${formatMoney(cp.min_purchase)}₫`);
      } else {
        message.error("Mã không khả dụng");
      }
      return;
    }
    setCoupon(cp);
    setCouponModal(false);
    message.success("Áp dụng mã thành công!");
  };

  const submitOrder = async (values: any) => {
    if (!selectedAddr) {
      message.warning("Chọn địa chỉ giao hàng");
      setStep(0);
      return;
    }

    const method = values.payment || payment;
    if (!method) {
      message.warning("Chọn phương thức thanh toán");
      return;
    }

    if (method === "vnpay" && vnpayError) {
      message.error(vnpayError);
      return;
    }

    if (coupon && !isCouponValid(coupon, subtotal)) {
      message.error("Mã giảm giá không hợp lệ");
      setCoupon(null);
      return;
    }

    const payload = {
      user_id: user?.id,
      total_amount: subtotal,
      discount_amount: discount,
      final_amount: total,
      status: "pending",
      payment_status: method === "vnpay" ? "pending" : "unpaid",
      note: values.note || "",
      sku: generateSKU(),
      shipping_name: selectedAddr.recipient_name,
      shipping_phone: selectedAddr.phone,
      city: selectedAddr.city,
      district: selectedAddr.district,
      commune: selectedAddr.commune,
      village: selectedAddr.village || "",
      notes: selectedAddr.notes || "",
      payment_method: method,
      shipping_fee: shipping,
      coupon_code: coupon?.code || null,
      coupon_id: coupon?.id || null,
      items: items.map((item) => ({
        variant_id: item.variant.id,
        sku: item.variant.sku,
        product_id: item.variant.product?.id,
        product_image: item.variant.image,
        product_name: item.variant.product?.name,
        size: item.variant.size?.value,
        color: item.variant.color?.value,
        quantity: item.quantity,
        price: getPrice(item.variant),
      })),
    };

    try {
      setSubmitting(true);

      const orderJson = await api.post("/orders", payload);
      const orderId = orderJson?.data?.id || orderJson?.id;

      if (!orderId) throw new Error("Không tạo được đơn hàng");

      if (method === "vnpay") {
        const vnpayJson = await api.post("/vnpay_payment", {
          order_id: orderId,
          bank_code: "", // Để trống = user chọn trên VNPay
        });

        const url = vnpayJson?.payment_url;
        if (!url) throw new Error("Không nhận được URL thanh toán");

        localStorage.setItem("pending_order_id", String(orderId));
        window.location.href = url;
        return;
      }

      // COD success
      message.success("Đặt hàng thành công!");
      localStorage.removeItem("selectedCartItems");
      setTimeout(() => (window.location.href = "/payment/success?order_id=" + orderId), 1500);
    } catch (err: any) {
      message.error(err.message || "Đặt hàng thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  // Render helpers
  const renderProduct = (item: CartItem) => (
    <div
      key={item.id}
      style={{
        display: "flex",
        gap: 16,
        padding: "16px 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <Image
        src={item.variant.image ? `${IMAGE_BASE_URL}${item.variant.image}` : ""}
        width={80}
        height={80}
        preview={false}
        style={{ borderRadius: 8, objectFit: "cover" }}
      />
      <div style={{ flex: 1 }}>
        <Text strong style={{ display: "block", marginBottom: 4 }}>
          {item.variant.product?.name}
        </Text>
        <Space size={4}>
          <Tag color="blue">Màu: {item.variant.color?.value || "-"}</Tag>
          <Tag color="cyan">Size: {item.variant.size?.value || "-"}</Tag>
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">SL: </Text>
          <Text strong>{item.quantity}</Text>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <Text type="danger">{formatMoney(getPrice(item.variant))}₫</Text>
        <br />
        <Text strong style={{ color: "#ff4d4f" }}>
          {formatMoney(getPrice(item.variant) * item.quantity)}₫
        </Text>
      </div>
    </div>
  );

  const renderAddress = (addr: Address) => {
    const isSelected = selectedAddr?.id === addr.id;
    return (
      <Card
        key={addr.id}
        size="small"
        hoverable
        style={{
          border: isSelected ? "2px solid #1890ff" : "1px solid #e8e8e8",
          background: isSelected ? "#f0f8ff" : "white",
        }}
      >
        <Radio value={addr.id}>
          <div style={{ marginLeft: 8 }}>
            <Space>
              <Text strong>{addr.recipient_name}</Text>
              <Divider type="vertical" />
              <Text>{addr.phone}</Text>
              {addr.is_default && <Tag color="green">Mặc định</Tag>}
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {[addr.notes, addr.village, addr.commune, addr.district, addr.city].filter(Boolean).join(", ")}
              </Text>
            </div>
          </div>
        </Radio>
      </Card>
    );
  };

  const renderCoupon = (cp: Coupon) => {
    const valid = isCouponValid(cp, subtotal);
    const selected = coupon?.id === cp.id;
    const reason = !valid
      ? !cp.is_active
        ? "Đã vô hiệu"
        : cp.end_date && new Date(cp.end_date) < new Date()
        ? "Hết hạn"
        : cp.used
        ? "Đã dùng"
        : `Đơn tối thiểu ${formatMoney(cp.min_purchase)}₫`
      : "";

    return (
      <List.Item
        key={cp.id}
        style={{
          padding: 16,
          border: selected ? "2px solid #1890ff" : "1px solid #f0f0f0",
          borderRadius: 8,
          marginBottom: 12,
          background: selected ? "#f0f8ff" : "white",
          opacity: valid ? 1 : 0.6,
          cursor: valid ? "pointer" : "not-allowed",
        }}
        onClick={() => valid && selectCoupon(cp)}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space>
              <GiftOutlined style={{ fontSize: 20, color: valid ? "#1890ff" : "#999" }} />
              <div>
                <Text strong>{cp.code}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Giảm {cp.discount_type === "percent" ? `${cp.discount_value}%` : `${formatMoney(cp.discount_value)}₫`}
                </Text>
              </div>
            </Space>
            {selected && <CheckCircleOutlined style={{ fontSize: 20, color: "#52c41a" }} />}
          </Space>
          {!valid && (
            <Alert message={reason} type="error" showIcon style={{ fontSize: 12 }} />
          )}
        </Space>
      </List.Item>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <Card style={{ marginBottom: 24, textAlign: "center" }}>
          <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
            <ShoppingOutlined /> Thanh toán đơn hàng
          </Title>
        </Card>

        {/* Steps */}
        <Card style={{ marginBottom: 24 }}>
          <Steps
            current={step}
            items={[
              { title: "Thông tin đơn hàng", icon: <ShoppingOutlined /> },
              { title: "Xác nhận & Thanh toán", icon: <CreditCardOutlined /> },
            ]}
          />
        </Card>

        {/* STEP 1 */}
        {step === 0 && (
          <Form form={form} onFinish={() => setStep(1)}>
            <Row gutter={16}>
              <Col xs={24} lg={16}>
                <Card
                  title={
                    <Space>
                      <ShoppingOutlined /> Sản phẩm <Badge count={items.length} />
                    </Space>
                  }
                  style={{ marginBottom: 16 }}
                >
                  {items.map(renderProduct)}
                </Card>

                <Card title={<Space><EnvironmentOutlined /> Địa chỉ nhận hàng</Space>}>
                  {addresses.length > 0 ? (
                    <Radio.Group
                      value={selectedAddr?.id}
                      onChange={(e) => setSelectedAddr(addresses.find((a) => a.id === e.target.value) || null)}
                      style={{ width: "100%" }}
                    >
                      <Space direction="vertical" style={{ width: "100%" }} size={12}>
                        {addresses.map(renderAddress)}
                      </Space>
                    </Radio.Group>
                  ) : (
                    <div style={{ textAlign: "center", padding: 32 }}>
                      <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
                      <Paragraph type="secondary">Chưa có địa chỉ</Paragraph>
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card title="Tóm tắt đơn hàng" style={{ position: "sticky", top: 24 }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text>Tạm tính:</Text>
                      <Text strong>{formatMoney(subtotal)}₫</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text>Phí ship:</Text>
                      <Text strong style={{ color: shipping === 0 ? "#52c41a" : undefined }}>
                        {shipping === 0 ? "Miễn phí" : `${formatMoney(shipping)}₫`}
                      </Text>
                    </div>
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                      <Text strong style={{ fontSize: 16 }}>Tổng:</Text>
                      <Text strong style={{ fontSize: 20, color: "#ff4d4f" }}>
                        {formatMoney(subtotal + shipping)}₫
                      </Text>
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      block
                      disabled={!selectedAddr}
                      onClick={() => form.submit()}
                      style={{ height: 48 }}
                    >
                      Tiếp tục
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Form>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <Row gutter={16}>
            <Col xs={24} lg={16}>
              <Form form={payForm} onFinish={submitOrder}>
                <Card
                  title={<Space><EnvironmentOutlined /> Thông tin giao hàng</Space>}
                  extra={<Button type="link" onClick={() => setStep(0)}>Thay đổi</Button>}
                  style={{ marginBottom: 16 }}
                >
                  <Space direction="vertical">
                    <Text strong>{selectedAddr?.recipient_name}</Text>
                    <Text>{selectedAddr?.phone}</Text>
                    <Text type="secondary">
                      {[selectedAddr?.notes,selectedAddr?.village, selectedAddr?.commune, selectedAddr?.district, selectedAddr?.city]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </Space>
                </Card>

                {vnpayError && (
                  <Alert
                    message="Thông báo VNPay"
                    description={vnpayError}
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Card title={<Space><CreditCardOutlined /> Phương thức thanh toán</Space>} style={{ marginBottom: 16 }}>
                  <Form.Item name="payment" rules={[{ required: true, message: "Chọn phương thức" }]}>
                    <Radio.Group onChange={(e) => setPayment(e.target.value)} style={{ width: "100%" }}>
                      <Space direction="vertical" style={{ width: "100%" }} size={12}>
                        <Card
                          size="small"
                          hoverable
                          style={{
                            border: payment === "cod" ? "2px solid #1890ff" : "1px solid #e8e8e8",
                            background: payment === "cod" ? "#f0f8ff" : "white",
                          }}
                        >
                          <Radio value="cod">
                            <Space>
                              <CheckCircleOutlined style={{ fontSize: 20, color: "#52c41a" }} />
                              <div>
                                <Text strong>COD</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                  Thanh toán khi nhận hàng
                                </Text>
                              </div>
                            </Space>
                          </Radio>
                        </Card>

                        <Card
                          size="small"
                          hoverable={!vnpayError}
                          style={{
                            border: payment === "vnpay" ? "2px solid #1890ff" : "1px solid #e8e8e8",
                            background: payment === "vnpay" ? "#f0f8ff" : "white",
                            opacity: vnpayError ? 0.5 : 1,
                            cursor: vnpayError ? "not-allowed" : "pointer",
                          }}
                        >
                          <Radio value="vnpay" disabled={!!vnpayError}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                              <Space>
                                <CreditCardOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                                <div>
                                  <Space>
                                    <Text strong>VNPay</Text>
                                    {vnpayError && <Tag color="red">Không khả dụng</Tag>}
                                  </Space>
                                  <br />
                                  <Text type="secondary" style={{ fontSize: 13 }}>
                                    Thẻ ATM, tín dụng, ví điện tử
                                  </Text>
                                </div>
                              </Space>
                            </Space>
                          </Radio>
                        </Card>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Card>

                <Card title="Ghi chú">
                  <Form.Item name="note">
                    <Input.TextArea rows={4} placeholder="Ghi chú (tùy chọn)" maxLength={500} showCount />
                  </Form.Item>
                </Card>
              </Form>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Chi tiết thanh toán" style={{ position: "sticky", top: 24 }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text>Tạm tính:</Text>
                    <Text strong>{formatMoney(subtotal)}₫</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text>Phí ship:</Text>
                    <Text strong style={{ color: shipping === 0 ? "#52c41a" : undefined }}>
                      {shipping === 0 ? "Miễn phí" : `${formatMoney(shipping)}₫`}
                    </Text>
                  </div>
                  {coupon && discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text>Giảm giá:</Text>
                      <Text strong style={{ color: "#52c41a" }}>
                        -{formatMoney(discount)}₫
                      </Text>
                    </div>
                  )}
                  <Divider style={{ margin: "8px 0" }} />

                  <Card size="small" style={{ background: "#fafafa" }}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space>
                        <GiftOutlined style={{ color: "#1890ff" }} />
                        <Text strong>Mã giảm giá</Text>
                      </Space>
                      {coupon ? (
                        <div style={{ background: "#f6ffed", padding: 12, borderRadius: 6 }}>
                          <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <Space>
                              <CheckCircleOutlined style={{ color: "#52c41a" }} />
                              <div>
                                <Text strong style={{ color: "#52c41a" }}>
                                  {coupon.code}
                                </Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Giảm {coupon.discount_type === "percent" 
                                    ? `${coupon.discount_value}%` 
                                    : `${formatMoney(coupon.discount_value)}₫`}
                                </Text>
                              </div>
                            </Space>
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                setCoupon(null);
                                message.info("Đã bỏ mã");
                              }}
                            />
                          </Space>
                        </div>
                      ) : (
                        <Button
                          type="dashed"
                          block
                          icon={<GiftOutlined />}
                          onClick={() => setCouponModal(true)}
                        >
                          Chọn mã
                        </Button>
                      )}
                    </Space>
                  </Card>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: 12,
                      background: "#f0f8ff",
                      borderRadius: 8,
                    }}
                  >
                    <Text strong style={{ fontSize: 16 }}>Tổng thanh toán:</Text>
                    <Text strong style={{ fontSize: 20, color: "#ff4d4f" }}>
                      {formatMoney(total)}₫
                    </Text>
                  </div>

                  {payment === "vnpay" && vnpayError && (
                    <Alert message={vnpayError} type="error" showIcon style={{ fontSize: 12 }} />
                  )}

                  <Space direction="vertical" style={{ width: "100%", marginTop: 16 }} size={8}>
                    <Button
                      type="primary"
                      size="large"
                      block
                      loading={submitting}
                      onClick={() => payForm.submit()}
                      disabled={payment === "vnpay" && !!vnpayError}
                      style={{ height: 48 }}
                    >
                      {payment === "vnpay" ? "Thanh toán VNPay" : "Đặt hàng"}
                    </Button>
                    <Button size="large" block onClick={() => setStep(0)} disabled={submitting}>
                      Quay lại
                    </Button>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {/* Coupon Modal */}
        <Modal
          title={
            <Space>
              <GiftOutlined style={{ color: "#1890ff" }} />
              <span>Chọn mã giảm giá</span>
            </Space>
          }
          open={couponModal}
          onCancel={() => setCouponModal(false)}
          footer={null}
          width={600}
        >
          {coupons.length > 0 ? (
            <List dataSource={coupons} renderItem={renderCoupon} />
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <GiftOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
              <Paragraph type="secondary" style={{ marginTop: 16 }}>
                Không có mã giảm giá khả dụng
              </Paragraph>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default CheckoutPage;