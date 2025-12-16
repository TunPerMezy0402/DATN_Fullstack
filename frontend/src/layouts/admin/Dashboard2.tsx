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
  BarChartOutlined,
  AreaChartOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
} from "recharts";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface RefundInfo {
  total_refund_needed: number;
  total_refunded: number;
  has_return_request: boolean;
}

interface OrderStats {
  total_orders: number;
  total_revenue: number;
  paid_amount: number;
  unpaid_amount: number;
  refunded_amount: number;
  pending_refund_amount: number;
  cod_pending_amount: number;
  pending_orders: number;
  confirmed_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  previous_revenue: number;
  revenue_growth: number;
}

interface Order {
  id: number;
  sku: string;
  user?: { name?: string };
  total_amount: number;
  final_amount?: number;
  payment_method: string;
  payment_status: string;
  actual_payment_status?: string;
  refund_info?: RefundInfo;
  created_at: string;
  shipping?: { shipping_status: string };
  items?: any[];
}

interface RevenueByDay {
  date: string;
  revenue: number;
  orders: number;
}

const Dashboard1: React.FC = () => {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>("month");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    fetchOrderData();
  }, [timeFilter, dateRange]);

  const getDateRange = () => {
    const now = dayjs();
    let startDate: dayjs.Dayjs;
    let endDate = now;

    switch (timeFilter) {
      case "today":
        startDate = now.startOf("day");
        break;
      case "week":
        startDate = now.startOf("week");
        break;
      case "month":
        startDate = now.startOf("month");
        break;
      case "year":
        startDate = now.startOf("year");
        break;
      case "custom":
        if (dateRange) {
          return { startDate: dateRange[0], endDate: dateRange[1] };
        }
        return null;
      default:
        return null;
    }

    return { startDate, endDate };
  };

  const filterOrders = (orders: Order[]) => {
    const range = getDateRange();
    if (!range) return orders;

    return orders.filter((order) => {
      const orderDate = dayjs(order.created_at);
      return (
        orderDate.isAfter(range.startDate.startOf("day")) &&
        orderDate.isBefore(range.endDate.endOf("day"))
      );
    });
  };

  const getPreviousRange = () => {
    const range = getDateRange();
    if (!range) return null;

    const diff = range.endDate.diff(range.startDate, "day");
    const previousEndDate = range.startDate.subtract(1, "day");
    const previousStartDate = previousEndDate.subtract(diff, "day");

    return { startDate: previousStartDate, endDate: previousEndDate };
  };

  const calculateRevenueByDay = (orders: Order[]) => {
    const revenueMap: { [key: string]: { revenue: number; orders: number } } = {};

    orders.forEach((order) => {
      const date = dayjs(order.created_at).format("DD/MM/YYYY");
      const amount = parseFloat(order.final_amount?.toString() || order.total_amount?.toString() || "0");

      if (!revenueMap[date]) {
        revenueMap[date] = { revenue: 0, orders: 0 };
      }

      revenueMap[date].revenue += amount;
      revenueMap[date].orders += 1;
    });

    return Object.entries(revenueMap)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
      }))
      .sort((a, b) => {
        const dateA = dayjs(a.date, "DD/MM/YYYY");
        const dateB = dayjs(b.date, "DD/MM/YYYY");
        return dateA.valueOf() - dateB.valueOf();
      });
  };

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token") || "";
      
      const response = await fetch("http://127.0.0.1:8000/api/admin/orders-admin", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = await response.json();
      const allOrders: Order[] = result?.data?.data || [];

      const filteredOrders = filterOrders(allOrders);
      const previousRange = getPreviousRange();
      
      const previousOrders = previousRange
        ? allOrders.filter((order) => {
            const orderDate = dayjs(order.created_at);
            return (
              orderDate.isAfter(previousRange.startDate.startOf("day")) &&
              orderDate.isBefore(previousRange.endDate.endOf("day"))
            );
          })
        : [];

      const currentRevenue = filteredOrders.reduce(
        (sum, order) => sum + parseFloat(order.final_amount?.toString() || order.total_amount?.toString() || "0"),
        0
      );

      const prevRevenue = previousOrders.reduce(
        (sum, order) => sum + parseFloat(order.final_amount?.toString() || order.total_amount?.toString() || "0"),
        0
      );

      const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      const paidAmount = filteredOrders
        .filter(o => (o.actual_payment_status || o.payment_status) === "paid")
        .reduce((sum, order) => sum + parseFloat(order.final_amount?.toString() || order.total_amount?.toString() || "0"), 0);

      const unpaidAmount = filteredOrders
        .filter(o => (o.actual_payment_status || o.payment_status) === "unpaid")
        .reduce((sum, order) => sum + parseFloat(order.final_amount?.toString() || order.total_amount?.toString() || "0"), 0);

      const refundedAmount = filteredOrders
        .filter(o => (o.actual_payment_status || o.payment_status) === "refunded")
        .reduce((sum, order) => sum + (order.refund_info?.total_refunded || 0), 0);

      const pendingRefundAmount = filteredOrders
        .filter(o => (o.actual_payment_status || o.payment_status) === "refund_processing")
        .reduce((sum, order) => sum + (order.refund_info?.total_refund_needed || 0), 0);

      const codPendingAmount = filteredOrders
        .filter(o => o.payment_method === "cod" && o.shipping?.shipping_status === "delivered" && (o.actual_payment_status || o.payment_status) === "unpaid")
        .reduce((sum, order) => sum + parseFloat(order.final_amount?.toString() || order.total_amount?.toString() || "0"), 0);

      setStats({
        total_orders: filteredOrders.length,
        total_revenue: currentRevenue,
        paid_amount: paidAmount,
        unpaid_amount: unpaidAmount,
        refunded_amount: refundedAmount,
        pending_refund_amount: pendingRefundAmount,
        cod_pending_amount: codPendingAmount,
        pending_orders: filteredOrders.filter((o) => o.shipping?.shipping_status === "pending").length,
        confirmed_orders: filteredOrders.filter((o) => o.shipping?.shipping_status === "in_transit").length,
        delivered_orders: filteredOrders.filter((o) => o.shipping?.shipping_status === "delivered").length,
        cancelled_orders: filteredOrders.filter((o) => o.shipping?.shipping_status === "none").length,
        previous_revenue: prevRevenue,
        revenue_growth: revenueGrowth,
      });

      setRecentOrders(filteredOrders.slice(0, 10));
      setRevenueByDay(calculateRevenueByDay(filteredOrders));
    } catch (error) {
      console.error("Error fetching order data:", error);
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
    nodone: { text: "Chưa thanh toán", color: "orange" },
    failed: { text: "Giao thất bại", color: "red" },
    return_processing: { text: "Đang xử lý hoàn hàng", color: "purple" },
    return_fail: { text: "Hoàn thất bại", color: "red" },
    returned: { text: "Đã hoàn hàng", color: "cyan" },
    none: { text: "Đã hủy", color: "red" },
    cancelled: { text: "Đã hủy", color: "red" },
  };

  const orderColumns: ColumnsType<Order> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 100,
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => record.user?.name || `Khách #${record.id}`,
      width: 150,
    },
    {
      title: "Tổng tiền",
      key: "amount",
      align: "right" as const,
      width: 120,
      render: (_, record) => {
        const amount = record.final_amount || record.total_amount;
        return `${Number(amount).toLocaleString("vi-VN")}₫`;
      },
    },
    {
      title: "PT Thanh toán",
      dataIndex: "payment_method",
      key: "payment_method",
      align: "center" as const,
      width: 100,
      render: (method: string) => {
        const color = method === "cod" ? "orange" : method === "vnpay" ? "blue" : "green";
        return <Tag color={color}>{paymentMethodMap[method] || method}</Tag>;
      },
    },
    {
      title: "TT Thanh toán",
      key: "payment_status",
      width: 150,
      render: (_, record) => {
        const status = record.actual_payment_status || record.payment_status;
        const info = paymentStatusMap[status] || { text: status, color: "default" };
        
        if (record.refund_info?.has_return_request) {
          return (
            <Space direction="vertical" size={0}>
              <Badge color={info.color} text={info.text} />
              {status === "refund_processing" && record.refund_info?.total_refund_needed > 0 && (
                <Text type="warning" style={{ fontSize: 11 }}>
                  Cần hoàn: {Number(record.refund_info.total_refund_needed).toLocaleString("vi-VN")}₫
                </Text>
              )}
              {status === "refunded" && record.refund_info?.total_refunded > 0 && (
                <Text type="success" style={{ fontSize: 11 }}>
                  Đã hoàn: {Number(record.refund_info.total_refunded).toLocaleString("vi-VN")}₫
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
      width: 110,
      render: (_, record) => {
        const status = record.shipping?.shipping_status || "pending";
        const info = shippingStatusMap[status] || { text: status, color: "default" };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh" }}>
        <div style={{ marginTop: "20vh" }}>
          <div
            style={{
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #1890ff",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
          <p style={{ marginTop: 16, color: "#666" }}>Đang tải dữ liệu...</p>
        </div>
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

  const orderCompletionRate = stats.total_orders > 0
    ? Math.round((stats.delivered_orders / stats.total_orders) * 100)
    : 0;

  const isRevenueGrowthPositive = stats.revenue_growth >= 0;

  const revenueChartData = revenueByDay.map(item => ({
    date: item.date,
    'Doanh thu': item.revenue,
    'Số đơn': item.orders * 50000,
  }));

  const paymentStatusData = [
    { name: 'Đã thanh toán', value: stats.paid_amount, color: '#52c41a' },
    { name: 'Chưa thanh toán', value: stats.unpaid_amount, color: '#faad14' },
    { name: 'Đã hoàn tiền', value: stats.refunded_amount, color: '#722ed1' },
    { name: 'Cần hoàn tiền', value: stats.pending_refund_amount, color: '#ff4d4f' },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <LineChartOutlined style={{ color: "#1890ff" }} />
              Dashboard - Thống kê Đơn hàng & Doanh thu
            </Title>
            <Text type="secondary">Cập nhật: {dayjs().format("HH:mm - DD/MM/YYYY")}</Text>
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

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={stats.total_orders}
              prefix={<ShoppingOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
            <Progress
              percent={orderCompletionRate}
              size="small"
              format={() => `${orderCompletionRate}% hoàn thành`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={stats.total_revenue}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              suffix="₫"
              valueStyle={{ color: "#52c41a" }}
              formatter={(value) => `${Number(value).toLocaleString("vi-VN")}`}
            />
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
              {isRevenueGrowthPositive ? (
                <RiseOutlined style={{ color: "#52c41a" }} />
              ) : (
                <FallOutlined style={{ color: "#ff4d4f" }} />
              )}
              <Text type={isRevenueGrowthPositive ? "success" : "danger"} style={{ fontSize: 12 }}>
                {isRevenueGrowthPositive ? "+" : ""}
                {stats.revenue_growth.toFixed(1)}% so với kỳ trước
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
                    {stats.cod_pending_amount.toLocaleString("vi-VN")}₫
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

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Đã thanh toán"
              value={stats.paid_amount}
              prefix={<WalletOutlined style={{ color: "#52c41a" }} />}
              suffix="₫"
              valueStyle={{ color: "#52c41a", fontSize: 18 }}
              formatter={(value) => `${Number(value).toLocaleString("vi-VN")}`}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Đã hoàn tiền"
              value={stats.refunded_amount}
              prefix={<SyncOutlined style={{ color: "#722ed1" }} />}
              suffix="₫"
              valueStyle={{ color: "#722ed1", fontSize: 18 }}
              formatter={(value) => `${Number(value).toLocaleString("vi-VN")}`}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Cần hoàn tiền"
              value={stats.pending_refund_amount}
              prefix={<ClockCircleOutlined style={{ color: "#ff4d4f" }} />}
              suffix="₫"
              valueStyle={{ color: "#ff4d4f", fontSize: 18 }}
              formatter={(value) => `${Number(value).toLocaleString("vi-VN")}`}
            />
          </Card>
        </Col>
      </Row>

      <Card title={<Space><CarOutlined /> Tình trạng vận chuyển</Space>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#52c41a", display: "block", fontWeight: 600 }}>
                  {stats.delivered_orders}
                </Text>
                <Text type="secondary">Đã giao hàng</Text>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CarOutlined style={{ fontSize: 32, color: "#1890ff", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#1890ff", display: "block", fontWeight: 600 }}>
                  {stats.confirmed_orders}
                </Text>
                <Text type="secondary">Đang giao</Text>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <ClockCircleOutlined style={{ fontSize: 32, color: "#faad14", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#faad14", display: "block", fontWeight: 600 }}>
                  {stats.pending_orders}
                </Text>
                <Text type="secondary">Chờ xử lý</Text>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CloseCircleOutlined style={{ fontSize: 32, color: "#ff4d4f", marginBottom: 8 }} />
              <div>
                <Text style={{ fontSize: 28, color: "#ff4d4f", display: "block", fontWeight: 600 }}>
                  {stats.cancelled_orders}
                </Text>
                <Text type="secondary">Đã hủy</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <AreaChartOutlined style={{ color: "#1890ff" }} />
                Biểu đồ doanh thu theo ngày
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
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
                    return [value.toLocaleString('vi-VN') + '₫', 'Doanh thu'];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="Doanh thu" stroke="#52c41a" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="Số đơn" stroke="#1890ff" fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: "#722ed1" }} />
                Phân bổ thanh toán
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={paymentStatusData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number | undefined) => {
                    if (!value) return '0₫';
                    return value.toLocaleString('vi-VN') + '₫';
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={<Space><ShoppingOutlined /> Đơn hàng gần đây</Space>}>
            <Table
              columns={orderColumns}
              dataSource={recentOrders}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              size="small"
              scroll={{ x: 1000 }}
              locale={{ emptyText: "Chưa có đơn hàng" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard1;