import React, { useEffect, useState } from "react";
import { Table, Badge, Button, Space, Typography, message, Card, Row, Col, Statistic, Tag } from "antd";
import { EyeOutlined, DollarOutlined, ShoppingOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
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

interface Shipping {
  id: number;
  sku: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_status: string;
}

interface Order {
  id: number;
  sku: string;
  user?: User;
  total_amount?: number | null;
  final_amount?: number | null;
  payment_status: string;
  payment_method: string;
  shipping?: Shipping;
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

// Maps từ OrderDetail
const paymentStatusMap: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  refund_processing: "Đang xử lý hoàn tiền",
  failed: "Thanh toán thất bại",
};

const paymentStatusColors: Record<string, string> = {
  unpaid: "default",
  paid: "green",
  refunded: "purple",
  refund_processing: "orange",
  failed: "red",
};

const shippingStatusMap: Record<string, string> = {
  pending: "Chờ xử lý",
  in_transit: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  failed: "Giao thất bại",
  returned: "Đã hoàn hàng",
  none: "Chưa xác nhận",
  nodone: "Chưa thanh toán",
  evaluated: "Đã đánh giá",
  return_processing: "Đang xử lý hoàn hàng",
  return_fail: "Hoàn hàng thất bại",
};

const shippingStatusColors: Record<string, string> = {
  pending: "gold",
  in_transit: "blue",
  delivered: "green",
  failed: "red",
  returned: "purple",
  none: "default",
  nodone: "orange",
  evaluated: "cyan",
  return_processing: "geekblue",
  return_fail: "volcano",
};

const paymentMethodMap: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPAY",
};

const paymentMethodColors: Record<string, string> = {
  cod: "orange",
  vnpay: "blue",
};

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchOrders = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/orders-admin`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: page,
          per_page: 20
        }
      });
      console.log("API Response:", res.data);

      const ordersData = res.data?.data?.data || [];
      const statsData = res.data?.stats || null;
      const totalData = res.data?.data?.total || 0;

      setOrders(ordersData);
      setStats(statsData);
      setTotal(totalData);
      setCurrentPage(page);
    } catch (err) {
      message.error("Không tải được danh sách đơn hàng");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "0 ₫";
    // Chuyển sang số nguyên để bỏ .00
    const numAmount = Math.round(Number(amount));
    return `${numAmount.toLocaleString("vi-VN")} ₫`;
  };

  const columns: ColumnsType<Order> = [
    { 
      title: "ID", 
      dataIndex: "id", 
      key: "id", 
      width: 70,
      align: "center",
      fixed: "left"
    },
    { 
      title: "SKU", 
      dataIndex: "sku", 
      key: "sku", 
      width: 120,
      fixed: "left"
    },
    {
      title: "Phương thức thanh toán",
      key: "payment_method",
      width: 200,
      render: (_, record) => (
        <Tag color={paymentMethodColors[record.payment_method] || "default"}>
          {paymentMethodMap[record.payment_method] || record.payment_method}
        </Tag>
      ),
    },
    {
      title: "Trạng thái thanh toán",
      key: "payment_status",
      width: 180,
      render: (_, record) => (
        <Tag color={paymentStatusColors[record.payment_status] || "default"}>
          {paymentStatusMap[record.payment_status] || record.payment_status}
        </Tag>
      ),
    },
    {
      title: "Trạng thái vận chuyển",
      key: "shipping_status",
      width: 200,
      render: (_, record) => (
        <Tag color={shippingStatusColors[record.shipping?.shipping_status || 'none'] || "default"}>
          {shippingStatusMap[record.shipping?.shipping_status || 'none'] || record.shipping?.shipping_status || "—"}
        </Tag>
      ),
    },
    {
      title: "Tổng tiền",
      key: "total",
      align: "right",
      width: 150,
      render: (_, record) => formatCurrency(record.final_amount ?? record.total_amount),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => navigate(`/admin/orders/${record.id}`)}
          size="small"
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <Title level={3}>📦 Quản lý đơn hàng</Title>

      {/* 🧮 Khu vực thống kê */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số đơn"
                value={stats.total_orders}
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng doanh thu"
                value={Math.round(stats.total_revenue)}
                prefix={<DollarOutlined />}
                suffix="₫"
                valueStyle={{ color: "#52c41a" }}
                formatter={(value) => `${Number(value).toLocaleString("vi-VN")}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Đơn chưa thanh toán"
                value={stats.unpaid_orders || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Đơn đã thanh toán"
                value={stats.total_orders - (stats.unpaid_orders || 0)}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
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
          pagination={{ 
            current: currentPage,
            pageSize: 20,
            total: total,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} đơn hàng`,
            onChange: (page) => fetchOrders(page)
          }}
          scroll={{ x: 1050 }}
        />
      </Card>
    </div>
  );
};

export default OrderList;