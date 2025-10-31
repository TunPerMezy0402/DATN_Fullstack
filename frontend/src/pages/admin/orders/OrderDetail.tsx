import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Descriptions, Divider, Typography, message, Card, Tag } from "antd";
import axios from "axios";

const { Text, Title } = Typography;

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

interface OrderItem {
  product_id: number;
  product_name: string;
  product_image?: string;
  variant_id?: number;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: number;
  sku: string;
  user?: { id?: number; name?: string; phone?: string; email?: string };
  total_amount?: number;
  note?: string;
  status: string;
  payment_status: string;
  items: OrderItem[];
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

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/orders-admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = res.data || {};
      const merged: Order = {
        id: payload.order?.id,
        sku: payload.order?.sku,
        user: payload.user ?? undefined,
        total_amount: payload.order?.total_amount,
        note: payload.order?.note,
        status: payload.order?.status,
        payment_status: payload.order?.payment_status,
        items: Array.isArray(payload.items) ? payload.items : [],
        shipping: payload.shipping ?? undefined,
      } as Order;
      setOrder(merged);
    } catch {
      message.error("Không tải được chi tiết đơn hàng");
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (!order) return <div>Đang tải...</div>;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Chi tiết đơn hàng #{order.id}</Title>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="SKU">{order.sku}</Descriptions.Item>
        <Descriptions.Item label="Tên khách hàng">{order.user?.name || "-"}</Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">{order.user?.phone || "-"}</Descriptions.Item>
        <Descriptions.Item label="Email">{order.user?.email || "-"}</Descriptions.Item>
        <Descriptions.Item label="Tổng tiền">{(order.total_amount ?? 0).toLocaleString("vi-VN")}₫</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">{statusMap[order.status] || order.status}</Descriptions.Item>
        <Descriptions.Item label="Thanh toán">{paymentMap[order.payment_status] || order.payment_status}</Descriptions.Item>
        <Descriptions.Item label="Ghi chú">{order.note || "-"}</Descriptions.Item>
      </Descriptions>

      <Divider>Chi tiết sản phẩm</Divider>
      {order.items.map((item, index) => (
        <Card key={`${item.product_id}-${index}`} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 20 }}>
            {/* Ảnh sản phẩm */}
            {item.product_image && (
              <div>
                <img 
                  src={item.product_image.startsWith('http') ? item.product_image : `${API_URL.replace('/api', '')}/${item.product_image}`}
                  alt={item.product_name}
                  style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8, border: "2px solid #f0f0f0" }}
                />
              </div>
            )}
            
            {/* Thông tin chi tiết */}
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 18, display: "block", marginBottom: 12 }}>
                {item.product_name}
              </Text>
              
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="Mã sản phẩm">
                  <Tag color="blue">#{item.product_id}</Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="Mã biến thể">
                  {item.variant_id ? <Tag color="purple">#{item.variant_id}</Tag> : <span style={{ color: "#999" }}>—</span>}
                </Descriptions.Item>
                
                <Descriptions.Item label="Kích thước">
                  {item.size ? (
                    <Tag color="cyan">{item.size}</Tag>
                  ) : (
                    <span style={{ color: "#999" }}>—</span>
                  )}
                </Descriptions.Item>
                
                <Descriptions.Item label="Màu sắc">
                  {item.color ? (
                    <span>
                      <Tag 
                        color={item.color.toLowerCase()} 
                        style={{ 
                          backgroundColor: item.color,
                          color: "#fff",
                          borderColor: item.color
                        }}
                      >
                        {item.color}
                      </Tag>
                    </span>
                  ) : (
                    <span style={{ color: "#999" }}>—</span>
                  )}
                </Descriptions.Item>
                
                <Descriptions.Item label="Số lượng">
                  <Text strong style={{ color: "#1890ff" }}>{item.quantity}</Text>
                </Descriptions.Item>
                
                <Descriptions.Item label="Giá đơn vị">
                  <Text>{item.price ? item.price.toLocaleString("vi-VN") : "0"}₫</Text>
                </Descriptions.Item>
                
                <Descriptions.Item label="Tổng tiền" span={2}>
                  <Text strong style={{ fontSize: 18, color: "#ff4d4f" }}>
                    {(item.subtotal ?? 0).toLocaleString("vi-VN")}₫
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        </Card>
      ))}

      <Divider>Tổng kết</Divider>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="Tổng số sản phẩm">{order.items.length}</Descriptions.Item>
        <Descriptions.Item label="Tổng số lượng">
          {order.items.reduce((sum, item) => sum + item.quantity, 0)}
        </Descriptions.Item>
        <Descriptions.Item label="Tổng tiền hàng">
          <Text strong style={{ fontSize: 18, color: "#ff4d4f" }}>
            {(order.items.reduce((sum, item) => sum + item.subtotal, 0)).toLocaleString("vi-VN")}₫
          </Text>
        </Descriptions.Item>
      </Descriptions>

      {order.shipping && (
        <>
          <Divider>Thông tin vận chuyển</Divider>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Người nhận">{order.shipping.shipping_name}</Descriptions.Item>
            <Descriptions.Item label="SĐT">{order.shipping.shipping_phone}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {order.shipping.shipping_address_line}, {order.shipping.shipping_city},{" "}
              {order.shipping.shipping_province}, {order.shipping.shipping_postal_code}
            </Descriptions.Item>
            <Descriptions.Item label="Đơn vị vận chuyển">{order.shipping.carrier}</Descriptions.Item>
            <Descriptions.Item label="Tracking">{order.shipping.tracking_number}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{order.shipping.shipping_status}</Descriptions.Item>
          </Descriptions>
        </>
      )}
    </div>
  );
};

export default OrderDetail;
