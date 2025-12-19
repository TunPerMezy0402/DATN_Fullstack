import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Typography,
  Progress,
  Badge,
  Select,
  DatePicker,
  Empty,
  Spin,
  Alert,
} from "antd";
import {
  ShoppingOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  LineChartOutlined,
  WalletOutlined,
  SyncOutlined,
  MoneyCollectOutlined,
  CarOutlined,
  AreaChartOutlined,
} from "@ant-design/icons";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import axios from "axios";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

interface DashboardStats {
  time_filter: string;
  date_range: { start: string; end: string };
  order_stats: {
    total_orders: number;
    total_revenue: number;
    previous_revenue: number;
    revenue_growth: number;
    delivered_orders: number;
    order_completion_rate: number;
  };
  revenue_stats: {
    paid_amount: number;
    unpaid_amount: number;
    vnpay_unpaid_amount: number;
    refunded_amount: number;
    pending_refund_amount: number;
    cod_pending_amount: number;
    total_coupon_discount: number;
  };
  shipping_stats: {
    delivered_orders: number;
    in_transit_orders: number;
    pending_orders: number;
    cancelled_orders: number;
  };
  revenue_by_day: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  recent_orders: Array<{
    id: number;
    sku: string;
    user_name: string | null;
    total_amount: number;
    final_amount: number;
    payment_method: string;
    payment_status: string;
    actual_payment_status: string;
    shipping_status: string;
    created_at: string;
    refund_info: {
      has_return_request: boolean;
      total_refund_needed: number;
      total_refunded: number;
    };
  }>;
}

// Helper function để format tiền VNĐ
const formatVND = (amount: number): string => {
  return Math.round(amount).toLocaleString("vi-VN");
};

const Dashboard2: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("month");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, [timeFilter, dateRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token") || "";
      const params: any = { time_filter: timeFilter };

      if (timeFilter === "custom" && dateRange) {
        params.start_date = dateRange[0].format("YYYY-MM-DD");
        params.end_date = dateRange[1].format("YYYY-MM-DD");
      }

      const response = await axios.get(`${API_URL}/admin/dashboard2/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError("Không thể tải dữ liệu thống kê");
      }
    } catch (err: any) {
      console.error("Error fetching dashboard stats:", err);
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const paymentStatusMap: Record<string, { text: string; color: string }> = {
    unpaid: { text: "Chưa thanh toán", color: "red" },
    paid: { text: "Đã thanh toán", color: "green" },
    refunded: { text: "Đã hoàn tiền", color: "purple" },
    refund_processing: { text: "Đang hoàn tiền", color: "orange" },
    failed: { text: "Thất bại", color: "volcano" },
  };

  const paymentMethodMap: Record<string, string> = {
    cod: "COD",
    vnpay: "VNPay",
    bank_transfer: "Chuyển khoản",
  };

  const shippingStatusMap: Record<string, { text: string; color: string }> = {
    pending: { text: "Chờ xử lý", color: "gold" },
    in_transit: { text: "Đang vận chuyển", color: "blue" },
    delivered: { text: "Đã giao hàng", color: "green" },
    received: { text: "Đã nhận hàng", color: "green" },
    evaluated: { text: "Đã đánh giá", color: "green" },
    nodone: { text: "Chờ thanh toán lại", color: "orange" },
    failed: { text: "Giao thất bại", color: "red" },
    return_processing: { text: "Đang xử lý hoàn hàng", color: "purple" },
    return_fail: { text: "Hoàn thất bại", color: "red" },
    returned: { text: "Đã hoàn hàng", color: "cyan" },
    none: { text: "Đã hủy", color: "red" },
    cancelled: { text: "Đã hủy", color: "red" },
  };

  const orderColumns: ColumnsType<any> = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center",
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
    },
    {
      title: "Khách hàng",
      dataIndex: "user_name",
      key: "user_name",
      width: 150,
      render: (name: string | null, record: any) => name || `Khách #${record.id}`,
    },
    {
      title: "Tổng tiền",
      key: "amount",
      align: "right",
      width: 120,
      render: (_, record) => `${formatVND(record.final_amount)}₫`,
    },
    {
      title: "PT Thanh toán",
      dataIndex: "payment_method",
      key: "payment_method",
      align: "center",
      width: 120,
      render: (method: string) => {
        const color = method === "cod" ? "orange" : method === "vnpay" ? "blue" : "green";
        return <Tag color={color}>{paymentMethodMap[method] || method}</Tag>;
      },
    },
    {
      title: "TT Thanh toán",
      key: "payment_status",
      width: 160,
      render: (_, record) => {
        const status = record.actual_payment_status;
        const info = paymentStatusMap[status] || { text: status, color: "default" };

        if (record.refund_info?.has_return_request) {
          return (
            <Space direction="vertical" size={0}>
              <Badge color={info.color} text={info.text} />
              {status === "refund_processing" && record.refund_info?.total_refund_needed > 0 && (
                <Text type="warning" style={{ fontSize: 11 }}>
                  Cần hoàn: {formatVND(record.refund_info.total_refund_needed)}₫
                </Text>
              )}
              {status === "refunded" && record.refund_info?.total_refunded > 0 && (
                <Text type="success" style={{ fontSize: 11 }}>
                  Đã hoàn: {formatVND(record.refund_info.total_refunded)}₫
                </Text>
              )}
            </Space>
          );
        }

        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: "TT Vận chuyển",
      key: "shipping_status",
      width: 140,
      render: (_, record) => {
        const status = record.shipping_status;
        const info = shippingStatusMap[status] || { text: status, color: "default" };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh" }}>
        <Spin size="large" style={{ marginTop: "20vh" }} />
        <p style={{ marginTop: 16, color: "#666" }}>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Lỗi" description={error} type="error" showIcon />
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Empty description="Không có dữ liệu" />
      </div>
    );
  }

  const isRevenueGrowthPositive = stats.order_stats.revenue_growth >= 0;

  const revenueChartData = stats.revenue_by_day.map(item => ({
    date: item.date,
    'Doanh thu': item.revenue,
    'Số đơn': item.orders * 50000,
  }));

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <LineChartOutlined style={{ color: "#1890ff" }} />
              Dashboard - Thống kê Đơn hàng & Doanh thu
            </Title>
            <Text type="secondary">
              Kỳ: {dayjs(stats.date_range.start).format("DD/MM/YYYY")} -{" "}
              {dayjs(stats.date_range.end).format("DD/MM/YYYY")}
            </Text>
          </Col>
          <Col>
            <Space size="middle">
              <Select
                value={timeFilter}
                onChange={(value) => {
                  setTimeFilter(value);
                  if (value !== "custom") setDateRange(null);
                }}
                style={{ width: 180 }}
                size="large"
                suffixIcon={<CalendarOutlined />}
              >
                <Select.Option value="today">Hôm nay</Select.Option>
                <Select.Option value="week">Tuần này</Select.Option>
                <Select.Option value="month">Tháng này</Select.Option>
                <Select.Option value="year">Năm này</Select.Option>
                <Select.Option value="custom">Tùy chỉnh</Select.Option>
              </Select>
              {timeFilter === "custom" && (
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                  format="DD/MM/YYYY"
                  size="large"
                />
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Main Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={stats.order_stats.total_orders}
              prefix={<ShoppingOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
            <Progress
              percent={stats.order_stats.order_completion_rate}
              size="small"
              format={() => `${stats.order_stats.order_completion_rate}% hoàn thành`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={formatVND(stats.order_stats.total_revenue)}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              suffix="₫"
              valueStyle={{ color: "#52c41a" }}
            />
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
              {isRevenueGrowthPositive ? (
                <RiseOutlined style={{ color: "#52c41a" }} />
              ) : (
                <FallOutlined style={{ color: "#ff4d4f" }} />
              )}
              <Text type={isRevenueGrowthPositive ? "success" : "danger"} style={{ fontSize: 12 }}>
                {isRevenueGrowthPositive ? "+" : ""}
                {stats.order_stats.revenue_growth}% so với kỳ trước
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={24} lg={8}>
          <Card style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>
            <Row justify="space-between" align="middle">
              <Col>
                <div>
                  <Text style={{ color: "#fff", fontSize: 14, display: "block", opacity: 0.9 }}>
                    Tiền COD cần thu
                  </Text>
                  <Text strong style={{ color: "#fff", fontSize: 28, display: "block", marginTop: 4 }}>
                    {formatVND(stats.revenue_stats.cod_pending_amount)}₫
                  </Text>
                  <Text style={{ color: "#fff", fontSize: 11, display: "block", marginTop: 4, opacity: 0.8 }}>
                    Đơn đã giao chưa thanh toán
                  </Text>
                </div>
              </Col>
              <Col>
                <MoneyCollectOutlined style={{ fontSize: 50, color: "rgba(255, 255, 255, 0.3)" }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Revenue Details */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6} md={4}>
          <Card>
            <Statistic
              title="Đã thanh toán"
              value={formatVND(stats.revenue_stats.paid_amount)}
              prefix={<WalletOutlined style={{ color: "#52c41a" }} />}
              suffix="₫"
              valueStyle={{ color: "#52c41a", fontSize: 18 }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card>
            <Statistic
              title="VNPay chưa TT"
              value={formatVND(stats.revenue_stats.vnpay_unpaid_amount)}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
              suffix="₫"
              valueStyle={{ color: "#faad14", fontSize: 18 }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card>
            <Statistic
              title="Đã hoàn tiền"
              value={formatVND(stats.revenue_stats.refunded_amount)}
              prefix={<SyncOutlined style={{ color: "#722ed1" }} />}
              suffix="₫"
              valueStyle={{ color: "#722ed1", fontSize: 18 }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card>
            <Statistic
              title="Cần hoàn tiền"
              value={formatVND(stats.revenue_stats.pending_refund_amount)}
              prefix={<ClockCircleOutlined style={{ color: "#ff4d4f" }} />}
              suffix="₫"
              valueStyle={{ color: "#ff4d4f", fontSize: 18 }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card>
            <Statistic
              title="Coupon đã dùng"
              value={formatVND(stats.revenue_stats.total_coupon_discount)}
              prefix={<DollarOutlined style={{ color: "#13c2c2" }} />}
              suffix="₫"
              valueStyle={{ color: "#13c2c2", fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Shipping Status */}
      <Card title={<Space><CarOutlined /> Tình trạng vận chuyển</Space>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <ClockCircleOutlined style={{ fontSize: 32, color: "#faad14", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#faad14", display: "block", fontWeight: 600 }}>
                  {stats.shipping_stats.pending_orders}
                </Text>
                <Text type="secondary">Chờ xử lý</Text>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CarOutlined style={{ fontSize: 32, color: "#1890ff", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#1890ff", display: "block", fontWeight: 600 }}>
                  {stats.shipping_stats.in_transit_orders}
                </Text>
                <Text type="secondary">Đang giao</Text>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#52c41a", display: "block", fontWeight: 600 }}>
                  {stats.shipping_stats.delivered_orders}
                </Text>
                <Text type="secondary">Đã giao hàng</Text>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CloseCircleOutlined style={{ fontSize: 32, color: "#ff4d4f", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#ff4d4f", display: "block", fontWeight: 600 }}>
                  {stats.shipping_stats.cancelled_orders}
                </Text>
                <Text type="secondary">Đã hủy</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card
            title={
              <Space>
                <AreaChartOutlined style={{ color: "#1890ff" }} />
                Biểu đồ doanh thu theo ngày
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (!value) return ['0', name || ''];
                    if (name === 'Số đơn') {
                      return [(value / 50000).toFixed(0) + ' đơn', 'Số đơn hàng'];
                    }
                    return [formatVND(value) + '₫', 'Doanh thu'];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="Doanh thu" stroke="#52c41a" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="Số đơn" stroke="#1890ff" fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent Orders Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={<Space><ShoppingOutlined /> Đơn hàng gần đây</Space>}>
            <Table
              columns={orderColumns}
              dataSource={stats.recent_orders}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: 1200 }}
              locale={{ emptyText: "Chưa có đơn hàng" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard2;