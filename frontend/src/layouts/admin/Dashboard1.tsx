import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  Progress,
  Avatar,
  List,
  Empty,
  Select,
  DatePicker,
} from "antd";
import {
  UserOutlined,
  AppstoreOutlined,
  TagsOutlined,
  GiftOutlined,
  FireOutlined,
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  ShopOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ProductStats {
  total_products: number;
  total_categories: number;
  products_with_variants: number;
  total_users: number;
  active_users: number;
  admin_users: number;
  total_coupons: number;
  active_coupons: number;
  total_coupon_usage: number;
}

interface TopProduct {
  id: number;
  name: string;
  total_sold: number;
  revenue: number;
}

interface TopCategory {
  id: number;
  name: string;
  product_count: number;
  total_sold: number;
  revenue: number;
}

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B6B"];

const Dashboard2: React.FC = () => {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>("month");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    fetchProductData();
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

  const filterOrders = (orders: any[]) => {
    const range = getDateRange();
    if (!range) return orders;

    return orders.filter((order: any) => {
      const orderDate = dayjs(order.created_at);
      return (
        orderDate.isAfter(range.startDate.startOf("day")) &&
        orderDate.isBefore(range.endDate.endOf("day"))
      );
    });
  };

  const calculateTopProducts = (orders: any[]) => {
    const productSales: {
      [key: string]: { name: string; total_sold: number; revenue: number };
    } = {};

    orders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productName = item.product_name || "Sản phẩm";
          const quantity = item.quantity || 0;
          const price = parseFloat(item.price || "0");
          const total = item.total || quantity * price;

          if (!productSales[productName]) {
            productSales[productName] = {
              name: productName,
              total_sold: 0,
              revenue: 0,
            };
          }

          productSales[productName].total_sold += quantity;
          productSales[productName].revenue += total;
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((item, index) => ({
        id: index + 1,
        name: item.name,
        total_sold: item.total_sold,
        revenue: item.revenue,
      }));
  };

  const calculateTopCategories = (orders: any[], products: any[]) => {
    const categorySales: {
      [key: string]: {
        id: number;
        name: string;
        product_count: number;
        total_sold: number;
        revenue: number;
      };
    } = {};

    const productCategoryMap: { [key: number]: { id: number; name: string } } = {};
    products.forEach((product: any) => {
      if (product.category) {
        productCategoryMap[product.id] = {
          id: product.category.id || product.category_id,
          name: product.category.name || "Chưa phân loại",
        };
      }
    });

    orders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productId = item.product_id;
          const category = productCategoryMap[productId];

          if (category) {
            const catName = category.name;
            const quantity = item.quantity || 0;
            const price = parseFloat(item.price || "0");
            const total = item.total || quantity * price;

            if (!categorySales[catName]) {
              categorySales[catName] = {
                id: category.id,
                name: catName,
                product_count: 0,
                total_sold: 0,
                revenue: 0,
              };
            }

            categorySales[catName].total_sold += quantity;
            categorySales[catName].revenue += total;
          }
        });
      }
    });

    return Object.values(categorySales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  };

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token") || "";
      const headers = { Authorization: `Bearer ${token}` };

      const [ordersRes, productsRes, categoriesRes, usersRes, couponsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/orders-admin`, { headers }),
        axios.get(`${API_URL}/admin/products?per_page=200`, { headers }),
        axios.get(`${API_URL}/admin/categories?per_page=200`, { headers }),
        axios.get(`${API_URL}/admin/users`, { headers }),
        axios.get(`${API_URL}/admin/coupons`, { headers }),
      ]);

      const allOrders = ordersRes.data?.data?.data || [];
      const filteredOrders = filterOrders(allOrders);

      const products = Array.isArray(productsRes.data?.data)
        ? productsRes.data.data
        : productsRes.data?.data?.data || [];

      const productsWithVariants = products.filter((p: any) => {
        if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
          return true;
        }
        if (
          p.variation_status === true ||
          p.variation_status === 1 ||
          p.variation_status === "1"
        ) {
          return true;
        }
        return false;
      }).length;

      const categories = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : categoriesRes.data?.data?.data || [];

      const users = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.users || usersRes.data?.data || [];
      const activeUsers = users.filter((u: any) => u.status === "active").length;
      const adminUsers = users.filter((u: any) => u.role === "admin").length;

      const coupons = Array.isArray(couponsRes.data)
        ? couponsRes.data
        : Array.isArray(couponsRes.data?.data)
        ? couponsRes.data.data
        : couponsRes.data?.data?.data || [];

      const activeCoupons = coupons.filter((c: any) => c.is_active).length;
      const totalCouponUsage = coupons.reduce(
        (sum: number, c: any) => sum + (c.used_count || 0),
        0
      );

      setStats({
        total_products: products.length,
        total_categories: categories.length,
        products_with_variants: productsWithVariants,
        total_users: users.length,
        active_users: activeUsers,
        admin_users: adminUsers,
        total_coupons: coupons.length,
        active_coupons: activeCoupons,
        total_coupon_usage: totalCouponUsage,
      });

      setTopProducts(calculateTopProducts(filteredOrders));
      setTopCategories(calculateTopCategories(filteredOrders, products));
    } catch (error) {
      console.error("Error fetching product data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const userActiveRate =
    stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0;

  const couponUsageRate =
    stats.total_coupons > 0
      ? Math.round((stats.active_coupons / stats.total_coupons) * 100)
      : 0;

  const productVariantRate =
    stats.total_products > 0
      ? Math.round((stats.products_with_variants / stats.total_products) * 100)
      : 0;

  // Data cho biểu đồ cột Top sản phẩm
  const topProductsChartData = topProducts.slice(0, 8).map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    'Doanh thu': item.revenue,
    'Đã bán': item.total_sold * 10000, // Nhân để hiển thị rõ hơn trên biểu đồ
  }));

  // Data cho biểu đồ tròn Danh mục
  const categoryPieData = topCategories.map(item => ({
    name: item.name,
    value: item.revenue,
  }));

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <ShopOutlined style={{ color: "#fa8c16" }} />
              Dashboard - Thống kê Sản phẩm & Người dùng
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

      {/* Main Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng sản phẩm"
              value={stats.total_products}
              prefix={<AppstoreOutlined style={{ color: "#fa8c16" }} />}
              valueStyle={{ color: "#fa8c16" }}
            />
            <Progress
              percent={productVariantRate}
              size="small"
              strokeColor="#fa8c16"
              format={() => `${productVariantRate}% có biến thể`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Danh mục sản phẩm"
              value={stats.total_categories}
              prefix={<TagsOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              {stats.products_with_variants} sản phẩm có biến thể
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng người dùng"
              value={stats.total_users}
              prefix={<UserOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1" }}
            />
            <Progress
              percent={userActiveRate}
              size="small"
              strokeColor="#722ed1"
              format={() => `${userActiveRate}% hoạt động`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng Coupon"
              value={stats.total_coupons}
              prefix={<GiftOutlined style={{ color: "#eb2f96" }} />}
              valueStyle={{ color: "#eb2f96" }}
            />
            <Progress
              percent={couponUsageRate}
              size="small"
              strokeColor="#eb2f96"
              format={() => `${couponUsageRate}% đang dùng`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card title={<Space><AppstoreOutlined style={{ color: "#fa8c16" }} />Chi tiết sản phẩm</Space>}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Row justify="space-between">
                <Text>Tổng sản phẩm:</Text>
                <Text strong style={{ color: "#fa8c16", fontSize: 16 }}>
                  {stats.total_products}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Có biến thể:</Text>
                <Text strong style={{ color: "#f5222d", fontSize: 16 }}>
                  {stats.products_with_variants}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Danh mục:</Text>
                <Text strong style={{ color: "#1890ff", fontSize: 16 }}>
                  {stats.total_categories}
                </Text>
              </Row>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card title={<Space><UserOutlined style={{ color: "#722ed1" }} />Chi tiết người dùng</Space>}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Row justify="space-between">
                <Text>Tổng người dùng:</Text>
                <Text strong style={{ color: "#722ed1", fontSize: 16 }}>
                  {stats.total_users}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Đang hoạt động:</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 16 }}>
                  {stats.active_users}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Quản trị viên:</Text>
                <Text strong style={{ color: "#fa541c", fontSize: 16 }}>
                  {stats.admin_users}
                </Text>
              </Row>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card title={<Space><GiftOutlined style={{ color: "#eb2f96" }} />Chi tiết Coupon</Space>}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Row justify="space-between">
                <Text>Tổng coupon:</Text>
                <Text strong style={{ color: "#eb2f96", fontSize: 16 }}>
                  {stats.total_coupons}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Đang hoạt động:</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 16 }}>
                  {stats.active_coupons}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text>Lượt sử dụng:</Text>
                <Text strong style={{ color: "#1890ff", fontSize: 16 }}>
                  {stats.total_coupon_usage}
                </Text>
              </Row>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: "#1890ff" }} />
                Biểu đồ Top 8 sản phẩm bán chạy
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProductsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  style={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (!value) return ['0', name || ''];
                    if (name === 'Đã bán') {
                      return [(value / 10000).toFixed(0) + ' sản phẩm', 'Số lượng đã bán'];
                    }
                    return [value.toLocaleString('vi-VN') + '₫', 'Doanh thu'];
                  }}
                />
                <Legend />
                <Bar dataKey="Doanh thu" fill="#52c41a" />
                <Bar dataKey="Đã bán" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <PieChartOutlined style={{ color: "#eb2f96" }} />
                Biểu đồ doanh thu theo danh mục
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number | undefined) => {
                    if (!value) return '0₫';
                    return value.toLocaleString('vi-VN') + '₫';
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Products & Categories Lists */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: "#f5222d" }} />
                Top 10 sản phẩm bán chạy
              </Space>
            }
          >
            <List
              dataSource={topProducts}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
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
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={<Text strong style={{ fontSize: 15 }}>{item.name}</Text>}
                    description={
                      <Row justify="space-between" style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Đã bán: <Text strong>{item.total_sold}</Text> sản phẩm
                        </Text>
                        <Text strong style={{ fontSize: 14, color: "#52c41a" }}>
                          {item.revenue.toLocaleString("vi-VN")}₫
                        </Text>
                      </Row>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Chưa có dữ liệu" }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: "#faad14" }} />
                Top danh mục bán chạy
              </Space>
            }
          >
            <List
              dataSource={topCategories}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{
                          backgroundColor:
                            index === 0
                              ? "#ffd700"
                              : index === 1
                              ? "#c0c0c0"
                              : index === 2
                              ? "#cd7f32"
                              : "#faad14",
                          fontWeight: "bold",
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={<Text strong style={{ fontSize: 15 }}>{item.name}</Text>}
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Chưa có dữ liệu" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard2;