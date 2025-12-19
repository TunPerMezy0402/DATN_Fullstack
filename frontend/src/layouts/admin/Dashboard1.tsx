import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  List,
  Empty,
  Select,
  DatePicker,
  Spin,
  Alert,
  Badge,
} from "antd";
import {
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  LineChartOutlined,
  CalendarOutlined,
  PieChartOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UserAddOutlined,
  GiftOutlined,
  AppstoreOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FF6B6B", "#4ECDC4", "#45B7D1"];

interface DashboardStats {
  time_filter: string;
  date_range: { start: string; end: string };
  revenue: {
    total: number;
    paid: number;
    unpaid: number;
    refund_processing: number;
    refunded: number;
    previous_period: number;
    growth_rate: number;
  };
  top_products_by_sales: Array<{
    id: number;
    name: string;
    image: string;
    total_sold: number;
    revenue: number;
  }>;
  top_products_by_price: Array<{
    id: number;
    name: string;
    image: string;
    total_sold: number;
    revenue: number;
    avg_price: number;
  }>;
  top_categories: Array<{
    id: number;
    name: string;
    total_sold: number;
    revenue: number;
  }>;
  revenue_chart: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
  users: {
    new_users: number;
    new_users_active: number;
    new_users_inactive: number;
    total_users: number;
    total_active: number;
    total_inactive: number;
  };
  coupons: {
    total: number;
    active: number;
    inactive: number;
    used_count: number;
    total_discount: number;
  };
  products: {
    total_sold: number;
    total_products_sold: number;
  };
  system: {
    total_products: number;
    total_categories: number;
    total_users: number;
  };
}

// Helper function để format tiền VNĐ (không có số thập phân)
const formatVND = (amount: number): string => {
  return Math.round(amount).toLocaleString("vi-VN");
};

const Dashboard1: React.FC = () => {
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

      const response = await axios.get(`${API_URL}/admin/dashboard1/stats`, {
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

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh" }}>
        <Spin size="large" style={{ marginTop: "20vh" }} />
        <p style={{ marginTop: 16, color: "#666" }}>Đang tải thống kê...</p>
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

  // Format revenue chart data
  const revenueChartData = stats.revenue_chart.map((item) => ({
    name: dayjs(item.period).format(
      timeFilter === "year" ? "MM/YYYY" : timeFilter === "today" || timeFilter === "week" ? "HH:mm" : "DD/MM"
    ),
    "Doanh thu": item.revenue,
    "Đơn hàng": item.orders,
  }));

  // Format categories for pie chart with percentage
  const totalCategoryRevenue = stats.top_categories.reduce((sum, item) => sum + item.revenue, 0);
  const categoryChartData = stats.top_categories.map((item) => ({
    name: item.name,
    value: item.revenue,
    percentage: totalCategoryRevenue > 0 ? ((item.revenue / totalCategoryRevenue) * 100).toFixed(1) : 0,
  }));

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <BarChartOutlined style={{ color: "#1890ff" }} />
              Dashboard - Thống kê Sản phẩm & Người dùng
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
              title="Tổng sản phẩm"
              value={stats.system.total_products}
              prefix={<ShoppingOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Đã bán: {stats.products.total_products_sold} loại
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Tổng Category"
              value={stats.system.total_categories}
              prefix={<TagsOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1" }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Danh mục sản phẩm
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Tổng người dùng"
              value={stats.system.total_users}
              prefix={<TeamOutlined style={{ color: "#eb2f96" }} />}
              valueStyle={{ color: "#eb2f96" }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              {stats.users.total_active} đang hoạt động
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Dashboard - Thống kê Chi tiết */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card 
            title={
              <Space>
                <ShoppingOutlined style={{ color: "#1890ff" }} />
                Chi tiết Sản phẩm
              </Space>
            } 
            bordered={false}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Row justify="space-between">
                <Text>Tổng sản phẩm:</Text>
                <Text strong style={{ color: "#1890ff", fontSize: 18 }}>
                  {stats.system.total_products}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Đã bán (kỳ):</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 18 }}>
                  {formatVND(stats.products.total_sold)}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Sản phẩm đã được mua:</Text>
                <Text strong style={{ color: "#722ed1", fontSize: 18 }}>
                  {stats.products.total_products_sold}
                </Text>
              </Row>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card 
            title={
              <Space>
                <UserAddOutlined style={{ color: "#722ed1" }} />
                Chi tiết Người dùng
              </Space>
            } 
            bordered={false}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Row justify="space-between">
                <Text>Tổng người dùng:</Text>
                <Text strong style={{ color: "#722ed1", fontSize: 18 }}>
                  {stats.system.total_users}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Đang hoạt động:</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 18 }}>
                  {stats.users.total_active}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Khóa/Không hoạt động:</Text>
                <Text strong style={{ color: "#f5222d", fontSize: 18 }}>
                  {stats.users.total_inactive}
                </Text>
              </Row>

            </Space>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card 
            title={
              <Space>
                <GiftOutlined style={{ color: "#eb2f96" }} />
                Chi tiết Coupon
              </Space>
            } 
            bordered={false}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Row justify="space-between">
                <Text>Tổng coupon:</Text>
                <Text strong style={{ color: "#eb2f96", fontSize: 18 }}>
                  {stats.coupons.total}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Đang hoạt động:</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 18 }}>
                  {stats.coupons.active}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Không hoạt động:</Text>
                <Text strong style={{ color: "#f5222d", fontSize: 18 }}>
                  {stats.coupons.inactive}
                </Text>
              </Row>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title={<Space><LineChartOutlined />Biểu đồ doanh thu theo thời gian</Space>}>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: any, name?: string) => {
                    if (name === "Doanh thu") {
                      return [formatVND(value) + "VNĐ", name];
                    }
                    return [value, name || ""];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Doanh thu"
                  stroke="#52c41a"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Line type="monotone" dataKey="Đơn hàng" stroke="#1890ff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<Space><PieChartOutlined />Doanh thu theo danh mục</Space>}>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${formatVND(value)}VNĐ (${props.payload.percentage}%)`,
                    name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Products - Side by Side */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <TrophyOutlined style={{ color: "#ffd700" }} />
                Top 10 sản phẩm bán chạy
              </Space>
            }
          >
            <List
              itemLayout="horizontal"
              dataSource={stats.top_products_by_sales}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge
                        count={`#${index + 1}`}
                        style={{
                          backgroundColor:
                            index === 0
                              ? "#ffd700"
                              : index === 1
                              ? "#c0c0c0"
                              : index === 2
                              ? "#cd7f32"
                              : "#1890ff",
                          fontWeight: "bold",
                          fontSize: 14,
                        }}
                      />
                    }
                    title={
                      <Text strong style={{ fontSize: 15 }}>
                        {item.name}
                      </Text>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        <Text type="secondary">
                          Đã bán: <Text strong style={{ color: "#52c41a" }}>{item.total_sold}</Text> sản phẩm
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <AppstoreOutlined style={{ color: "#722ed1" }} />
                Top 10 sản phẩm doanh thu cao
              </Space>
            }
          >
            <List
              itemLayout="horizontal"
              dataSource={stats.top_products_by_price}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge
                        count={`#${index + 1}`}
                        style={{
                          backgroundColor:
                            index === 0
                              ? "#ffd700"
                              : index === 1
                              ? "#c0c0c0"
                              : index === 2
                              ? "#cd7f32"
                              : "#722ed1",
                          fontWeight: "bold",
                          fontSize: 14,
                        }}
                      />
                    }
                    title={
                      <Text strong style={{ fontSize: 15 }}>
                        {item.name}
                      </Text>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        <Text style={{ color: "#722ed1" }}>
                          Doanh thu: <Text strong>{formatVND(item.revenue)}VNĐ</Text>
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard1;