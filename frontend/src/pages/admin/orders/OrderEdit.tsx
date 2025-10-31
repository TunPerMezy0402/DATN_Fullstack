import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Input, Select, Button, Divider, message, Typography, Descriptions } from "antd";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;

interface Shipping {
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address_line?: string;
  shipping_city?: string;
  shipping_province?: string;
  shipping_postal_code?: string;
  carrier?: string;
  tracking_number?: string;
  shipping_status?: string;
}

interface Order {
  id: number;
  sku?: string;
  user?: { id?: number; name?: string; phone?: string; email?: string };
  status: string;
  payment_status: string;
  shipping?: Shipping;
}

const API_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";

const statusMap: Record<string, string> = {
  pending: "Đang chờ",
  confirmed: "Xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  returned: "Trả lại",
};

const paymentMap: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thanh toán thất bại",
};

const OrderUpdate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/orders-admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Backend returns shape: { order: {...}, items: [...], shipping: {...}, ... }
      const payload = res.data || {};
      const merged: Order = {
        id: payload.order?.id,
        sku: payload.order?.sku,
        user: payload.user ?? undefined,
        status: payload.order?.status,
        payment_status: payload.order?.payment_status,
        shipping: payload.shipping ?? undefined,
      } as Order;
      setOrder(merged);
      form.setFieldsValue({
        status: merged.status,
        payment_status: merged.payment_status,
        shipping: merged.shipping,
      });
    } catch {
      message.error("Không tải được đơn hàng");
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(`${API_URL}/admin/orders-admin/${id}`, values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Cập nhật thành công");
      navigate("/admin/orders");
    } catch {
      message.error("Cập nhật thất bại");
    }
  };

  if (!order) return <div>Đang tải...</div>;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Cập nhật đơn hàng #{order.id}</Title>
      
      <Divider>Thông tin khách hàng</Divider>
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Tên khách hàng">{order.user?.name || "-"}</Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">{order.user?.phone || "-"}</Descriptions.Item>
        <Descriptions.Item label="Email">{order.user?.email || "-"}</Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Form.Item label="Trạng thái" name="status">
          <Select>
            {Object.entries(statusMap).map(([key, val]) => (
              <Option key={key} value={key}>{val}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Thanh toán" name="payment_status">
          <Select>
            {Object.entries(paymentMap).map(([key, val]) => (
              <Option key={key} value={key}>{val}</Option>
            ))}
          </Select>
        </Form.Item>

        <Divider>Thông tin vận chuyển</Divider>
        <Form.Item label="Người nhận" name={["shipping", "shipping_name"]}><Input /></Form.Item>
        <Form.Item label="SĐT" name={["shipping", "shipping_phone"]}><Input /></Form.Item>
        <Form.Item label="Địa chỉ" name={["shipping", "shipping_address_line"]}><Input /></Form.Item>
        <Form.Item label="Thành phố" name={["shipping", "shipping_city"]}><Input /></Form.Item>
        <Form.Item label="Tỉnh/Quận" name={["shipping", "shipping_province"]}><Input /></Form.Item>
        <Form.Item label="Mã bưu chính" name={["shipping", "shipping_postal_code"]}><Input /></Form.Item>
        <Form.Item label="Đơn vị vận chuyển" name={["shipping", "carrier"]}><Input /></Form.Item>
        <Form.Item label="Tracking" name={["shipping", "tracking_number"]}><Input /></Form.Item>
        <Form.Item label="Trạng thái vận chuyển" name={["shipping", "shipping_status"]}><Input /></Form.Item>

        <Button type="primary" onClick={handleUpdate}>Cập nhật</Button>
      </Form>
    </div>
  );
};

export default OrderUpdate;
