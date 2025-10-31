import React, { useEffect, useState } from "react";
import { Table, Badge, Button, Space, Typography, message } from "antd";
import { EyeOutlined, EditOutlined } from "@ant-design/icons";
import axios from "axios";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

interface Order {
  id: number;
  sku: string;
  user?: { id?: number; name?: string; phone?: string; email?: string };
  total_amount?: number | null;
  status: string;
  payment_status: string;
}

const API_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "Đang chờ", color: "gold" },
  confirmed: { text: "Xác nhận", color: "blue" },
  shipped: { text: "Đang giao", color: "purple" },
  delivered: { text: "Đã giao", color: "cyan" },
  completed: { text: "Hoàn tất", color: "green" },
  cancelled: { text: "Đã hủy", color: "red" },
  returned: { text: "Trả lại", color: "orange" },
};

const paymentMap: Record<string, { text: string; color: string }> = {
  unpaid: { text: "Chưa thanh toán", color: "red" },
  paid: { text: "Đã thanh toán", color: "green" },
  refunded: { text: "Đã hoàn tiền", color: "orange" },
  failed: { text: "Thanh toán thất bại", color: "volcano" },
};

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/orders-admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("API Response:", res.data);
      console.log("Orders data:", res.data.data);
      setOrders(res.data.data || []);
    } catch (err) {
      message.error("Không tải được danh sách đơn hàng");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const columns: ColumnsType<Order> = [
    { title: "ID", dataIndex: "id", key: "id", width: 60, align: "center" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120 },
    {
      title: "Tên khách",
      key: "name",
      render: (_, record) => record.user?.name || `#${record.id}`,
    },
    {
      title: "SĐT",
      key: "phone",
      render: (_, record) => record.user?.phone || "-",
    },
    {
      title: "Tổng tiền",
      key: "total",
      align: "right",
      render: (_, record) => (record.total_amount ?? 0).toLocaleString("vi-VN") + "₫",
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => {
        const info = statusMap[record.status] || { text: record.status, color: "default" };
        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: "Thanh toán",
      key: "payment_status",
      render: (_, record) => {
        const info = paymentMap[record.payment_status] || {
          text: record.payment_status,
          color: "default",
        };
        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/admin/orders/${record.id}`)}>
            Chi tiết
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/admin/orders/${record.id}/edit`)}>
            Cập nhật
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <Title level={3}>Danh sách đơn hàng</Title>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default OrderList;
