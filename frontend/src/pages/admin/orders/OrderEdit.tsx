import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Select,
  Button,
  message,
  Spin,
  Typography,
  Space,
  Row,
  Col,
  Input,
  Alert,
  Steps,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

interface Order {
  id: number;
  sku: string;
  status: string;
  payment_status: string;
  shipping: {
    id: number;
    shipping_status: string;
    shipper_name?: string | null;
    shipper_phone?: string | null;
  };
}

const API_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";

// Định nghĩa các bước trạng thái đơn hàng theo thứ tự
const ORDER_STATUS_STEPS = [
  { value: "pending", label: "Đang chờ", step: 0 },
  { value: "confirmed", label: "Đã xác nhận", step: 1 },
  { value: "shipped", label: "Đang giao", step: 2 },
  { value: "delivered", label: "Đã giao", step: 3 },
  { value: "completed", label: "Hoàn tất", step: 4 },
  { value: "returned", label: "Trả lại", step: 5 },
  { value: "cancelled", label: "Đã hủy", step: 6 },
];

const SHIPPING_STATUS_STEPS = [
  { value: "pending", label: "Chờ xử lý", step: 0 },
  { value: "in_transit", label: "Đang vận chuyển", step: 1 },
  { value: "delivered", label: "Đã giao hàng", step: 2 },
  { value: "failed", label: "Giao thất bại", step: 3 },
  { value: "returning", label: "Đang hoàn hàng về kho", step: 4 },
  { value: "returned", label: "Đã hoàn hàng", step: 5 },
];

// Map đồng bộ: Trạng thái đơn hàng → Trạng thái vận chuyển
const ORDER_TO_SHIPPING_MAP: Record<string, string> = {
  pending: "pending",
  confirmed: "pending",
  shipped: "in_transit",
  delivered: "delivered",
  completed: "delivered",
  returned: "returned",
  cancelled: "pending",
};

// Map đồng bộ: Trạng thái vận chuyển → Trạng thái đơn hàng
const SHIPPING_TO_ORDER_MAP: Record<string, string> = {
  pending: "confirmed",
  in_transit: "shipped",
  delivered: "delivered",
  failed: "confirmed",
  returning: "returned",
  returned: "returned",
};

const OrderUpdate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentOrderStep, setCurrentOrderStep] = useState(0);
  const [currentShippingStep, setCurrentShippingStep] = useState(0);
  const [showShipperInfo, setShowShipperInfo] = useState(false);

  // Lấy thông tin đơn hàng
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/orders-admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const orderData = res.data.data;
      setOrder(orderData);

      // Set giá trị form
      form.setFieldsValue({
        status: orderData.status,
        payment_status: orderData.payment_status,
        shipping_status: orderData.shipping.shipping_status,
        shipper_name: orderData.shipping.shipper_name,
        shipper_phone: orderData.shipping.shipper_phone,
      });

      // Tính step hiện tại
      const orderStep = ORDER_STATUS_STEPS.find((s) => s.value === orderData.status);
      const shippingStep = SHIPPING_STATUS_STEPS.find(
        (s) => s.value === orderData.shipping.shipping_status
      );

      setCurrentOrderStep(orderStep?.step ?? -1);
      setCurrentShippingStep(shippingStep?.step ?? -1);

      // Hiển thị shipper info nếu đang vận chuyển
      setShowShipperInfo(orderData.shipping.shipping_status === "in_transit");
    } catch (error) {
      console.error(error);
      message.error("Không thể tải thông tin đơn hàng!");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Validate trạng thái đơn hàng - chỉ được chuyển tiếp hoặc sang trạng thái đặc biệt
  const validateOrderStatus = (_: any, value: string) => {
    if (!order) return Promise.resolve();

    const currentStep = ORDER_STATUS_STEPS.find((s) => s.value === order.status);
    const newStep = ORDER_STATUS_STEPS.find((s) => s.value === value);

    if (!currentStep || !newStep) return Promise.resolve();

    // Cho phép: giữ nguyên, chuyển tiếp 1 bước, hoặc chuyển sang returned/cancelled
    if (
      newStep.step === currentStep.step ||
      newStep.step === currentStep.step + 1 ||
      value === "returned" ||
      value === "cancelled"
    ) {
      return Promise.resolve();
    }

    return Promise.reject(
      new Error("Chỉ được chuyển sang bước tiếp theo hoặc trạng thái đặc biệt!")
    );
  };

  // Validate trạng thái vận chuyển - chỉ được chuyển tiếp
  const validateShippingStatus = (_: any, value: string) => {
    if (!order) return Promise.resolve();

    const currentStep = SHIPPING_STATUS_STEPS.find(
      (s) => s.value === order.shipping.shipping_status
    );
    const newStep = SHIPPING_STATUS_STEPS.find((s) => s.value === value);

    if (!currentStep || !newStep) return Promise.resolve();

    // Cho phép: giữ nguyên hoặc chuyển tiếp 1 bước
    if (
      newStep.step === currentStep.step ||
      newStep.step === currentStep.step + 1
    ) {
      return Promise.resolve();
    }

    return Promise.reject(
      new Error("Chỉ được chuyển sang bước tiếp theo!")
    );
  };

  // Xử lý khi thay đổi trạng thái đơn hàng
  const handleOrderStatusChange = (value: string) => {
    // Đồng bộ sang trạng thái vận chuyển
    const newShippingStatus = ORDER_TO_SHIPPING_MAP[value];

    if (newShippingStatus) {
      form.setFieldsValue({ shipping_status: newShippingStatus });

      // Cập nhật step hiển thị
      const shippingStep = SHIPPING_STATUS_STEPS.find(
        (s) => s.value === newShippingStatus
      );
      if (shippingStep) {
        setCurrentShippingStep(shippingStep.step);
      }

      // Hiển thị/ẩn form shipper
      setShowShipperInfo(newShippingStatus === "in_transit");

      // Reset shipper info nếu không phải đang vận chuyển
      if (newShippingStatus !== "in_transit") {
        form.setFieldsValue({
          shipper_name: null,
          shipper_phone: null,
        });
      }
    }
  };

  // Xử lý khi thay đổi trạng thái vận chuyển
  const handleShippingStatusChange = (value: string) => {
    // Đồng bộ sang trạng thái đơn hàng
    const newOrderStatus = SHIPPING_TO_ORDER_MAP[value];

    if (newOrderStatus) {
      form.setFieldsValue({ status: newOrderStatus });

      // Cập nhật step hiển thị
      const orderStep = ORDER_STATUS_STEPS.find((s) => s.value === newOrderStatus);
      if (orderStep) {
        setCurrentOrderStep(orderStep.step);
      }
    }

    // Hiển thị/ẩn form shipper
    setShowShipperInfo(value === "in_transit");

    // Reset shipper info nếu không phải đang vận chuyển
    if (value !== "in_transit") {
      form.setFieldsValue({
        shipper_name: null,
        shipper_phone: null,
      });
    }
  };

  // Submit form
  const handleSubmit = async (values: any) => {
  try {
    setSubmitting(true);

    const updateData: any = {
      status: values.status,
      payment_status: values.payment_status,
      shipping: {
        shipping_status: values.shipping_status,
      },
    };

    // Thêm thông tin shipper nếu đang vận chuyển
    if (values.shipping_status === "in_transit") {
      updateData.shipping.shipper_name = values.shipper_name;
      updateData.shipping.shipper_phone = values.shipper_phone;
    }

    await axios.put(`${API_URL}/admin/orders-admin/${id}`, updateData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    message.success("Cập nhật đơn hàng thành công!");
    navigate(`/admin/orders/${id}`);
  } catch (error: any) {
    console.error(error);
    message.error(
      error.response?.data?.message || "Cập nhật đơn hàng thất bại!"
    );
  } finally {
    setSubmitting(false);
  }
};


  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải thông tin..." />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/orders/${id}`)}
              >
                Quay lại
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Cập nhật đơn hàng #{order.sku}
              </Title>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Form cập nhật */}
        <Col xs={24} lg={16}>
          <Card title="Thông tin cập nhật" style={{ borderRadius: 8 }}>
            <Alert
              message="Lưu ý quan trọng"
              description="Trạng thái đơn hàng và trạng thái vận chuyển sẽ TỰ ĐỘNG ĐỒNG BỘ với nhau. Khi bạn thay đổi một trong hai, trạng thái còn lại sẽ được cập nhật tương ứng (ví dụ: Đang giao ↔ Đang vận chuyển, Hoàn tất ↔ Đã giao hàng)."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              {/* Trạng thái đơn hàng */}
              <Form.Item
                label={<Text strong>Trạng thái đơn hàng</Text>}
                name="status"
                rules={[
                  { required: true, message: "Vui lòng chọn trạng thái!" },
                  { validator: validateOrderStatus },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Chọn trạng thái đơn hàng"
                  suffixIcon={<ClockCircleOutlined />}
                  onChange={handleOrderStatusChange}
                >
                  <Option
                    disabled
                    style={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}
                  >
                    Trạng thái theo quy trình
                  </Option>

                  {ORDER_STATUS_STEPS.map((status) => (
                    <Option
                      key={status.value}
                      value={status.value}
                      disabled={
                        currentOrderStep >= 0 && status.step < currentOrderStep
                      }
                    >
                      {status.label}
                      {status.step === currentOrderStep && " (Hiện tại)"}
                      {currentOrderStep >= 0 && status.step < currentOrderStep && " ✓"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider />

              {/* Trạng thái vận chuyển */}
              <Form.Item
                label={<Text strong>Trạng thái vận chuyển</Text>}
                name="shipping_status"
                rules={[
                  { required: true, message: "Vui lòng chọn trạng thái vận chuyển!" },
                  { validator: validateShippingStatus },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Chọn trạng thái vận chuyển"
                  onChange={handleShippingStatusChange}
                >
                  <Option disabled style={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
                    Trạng thái theo quy trình
                  </Option>
                  {SHIPPING_STATUS_STEPS.map((status) => (
                    <Option
                      key={status.value}
                      value={status.value}
                      disabled={
                        currentShippingStep >= 0 &&
                        status.step < currentShippingStep
                      }
                    >
                      {status.label}
                      {status.step === currentShippingStep && " (Hiện tại)"}
                      {currentShippingStep >= 0 &&
                        status.step < currentShippingStep &&
                        " ✓"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Thông tin người giao hàng - hiện khi đang vận chuyển */}
              {showShipperInfo && (
                <Card
                  title="Thông tin người giao hàng"
                  style={{
                    marginBottom: 24,
                    backgroundColor: "#f6ffed",
                    borderColor: "#b7eb8f",
                  }}
                  size="small"
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Tên người giao hàng"
                        name="shipper_name"
                        rules={[
                          {
                            required: showShipperInfo,
                            message: "Vui lòng nhập tên người giao hàng!",
                          },
                        ]}
                      >
                        <Input
                          size="large"
                          placeholder="Nhập tên shipper"
                          maxLength={100}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Số điện thoại"
                        name="shipper_phone"
                        rules={[
                          {
                            required: showShipperInfo,
                            message: "Vui lòng nhập số điện thoại!",
                          },
                          {
                            pattern: /^[0-9]{10,11}$/,
                            message: "Số điện thoại không hợp lệ (10-11 số)!",
                          },
                        ]}
                      >
                        <Input
                          size="large"
                          placeholder="Nhập số điện thoại"
                          maxLength={11}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Buttons */}
              <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                <Space size="middle">
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<SaveOutlined />}
                    loading={submitting}
                  >
                    Lưu thay đổi
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate(`/orders/${id}`)}
                    disabled={submitting}
                  >
                    Hủy
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Sidebar - Tiến trình */}
        <Col xs={24} lg={8}>

          {/* Tiến trình vận chuyển */}
          <Card title="Tiến trình vận chuyển" style={{ borderRadius: 8 }}>
            <Steps
              direction="vertical"
              current={currentShippingStep}
              items={SHIPPING_STATUS_STEPS.map((step, index) => ({
                title: step.label,
                status:
                  index < currentShippingStep
                    ? "finish"
                    : index === currentShippingStep
                      ? "process"
                      : "wait",
                icon:
                  index < currentShippingStep ? (
                    <CheckCircleOutlined />
                  ) : index === currentShippingStep ? (
                    <LoadingOutlined />
                  ) : (
                    <ClockCircleOutlined />
                  ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderUpdate;