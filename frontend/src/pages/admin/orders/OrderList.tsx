import React, { useEffect, useState } from "react";
import { Table, Badge, Button, Space, Typography, message, Card, Row, Col, Statistic } from "antd";
import { EyeOutlined, EditOutlined, DollarOutlined, ShoppingOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

interface User {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
}

interface Order {
  id: number;
  sku: string;
  user?: User;
  total_amount?: number | null;
  final_amount?: number | null;
  payment_status: string;
}

interface Stats {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  confirmed_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  unpaid_orders: number;
  refunded_orders: number;
}

const API_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";


const paymentMap: Record<string, { text: string; color: string }> = {
  unpaid: { text: "Chưa thanh toán", color: "red" },
  paid: { text: "Đã thanh toán", color: "green" },
  refunded: { text: "Đã hoàn tiền", color: "orange" },
  failed: { text: "Thanh toán thất bại", color: "volcano" },
};

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/orders-admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("API Response:", res.data);

      const ordersData = res.data?.data?.data || []; // lấy từ data.pagination
      const statsData = res.data?.stats || null;

      setOrders(ordersData);
      setStats(statsData);
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
      render: (_, record) =>
        (record.final_amount ?? record.total_amount ?? 0).toLocaleString("vi-VN") + "₫",
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
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/orders/${record.id}`)}
          >
            Chi tiết
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/admin/orders/${record.id}/edit`)}
          >
            Cập nhật
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <Title level={3}>📦 Quản lý đơn hàng</Title>

      {/* 🧮 Khu vực thống kê */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Tổng số đơn"
                value={stats.total_orders}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Tổng doanh thu"
                value={stats.total_revenue}
                prefix={<DollarOutlined />}
                suffix="₫"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Đơn đang chờ"
                value={stats.pending_orders}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Đơn đã giao"
                value={stats.delivered_orders}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 📋 Bảng danh sách đơn hàng */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={orders}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default OrderList;
