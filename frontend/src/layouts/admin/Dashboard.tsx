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
  Avatar,
  List,
  Divider,
  Empty,
  Select,
  DatePicker,
} from "antd";
import {
  ShoppingOutlined,
  UserOutlined,
  DollarOutlined,
  GiftOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
  AppstoreOutlined,
  TagsOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FireOutlined,
  TeamOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface DashboardStats {
  // Đơn hàng
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  confirmed_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  
  // Sản phẩm
  total_products: number;
  total_categories: number;
  products_with_variants: number;
  
  // Người dùng
  total_users: number;
  active_users: number;
  admin_users: number;
  
  // Coupon
  total_coupons: number;
  active_coupons: number;
  total_coupon_usage: number;
}

interface RecentOrder {
  id: number;
  sku: string;
  user?: { name?: string };
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

interface TopProduct {
  id: number;
  name: string;
  total_sold: number;
  revenue: number;
}

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [previousRevenue, setPreviousRevenue] = useState<number>(0);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter, dateRange]);

  const getDateRangeFromFilter = () => {
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

  const filterOrdersByDate = (orders: any[]) => {
    const range = getDateRangeFromFilter();
    if (!range) return orders;

    return orders.filter((order: any) => {
      const orderDate = dayjs(order.created_at);
      return orderDate.isAfter(range.startDate) && orderDate.isBefore(range.endDate);
    });
  };

  const getPreviousDateRange = () => {
    const range = getDateRangeFromFilter();
    if (!range) return null;

    const diff = range.endDate.diff(range.startDate, "day");
    const previousEndDate = range.startDate.subtract(1, "day");
    const previousStartDate = previousEndDate.subtract(diff, "day");

    return { startDate: previousStartDate, endDate: previousEndDate };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats
      const [ordersRes, productsRes, categoriesRes, usersRes, couponsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/orders-admin`, { headers }),
        axios.get(`${API_URL}/admin/products?per_page=200`, { headers }),
        axios.get(`${API_URL}/admin/categories?per_page=200`, { headers }),
        axios.get(`${API_URL}/admin/users`, { headers }),
        axios.get(`${API_URL}/admin/coupons`, { headers }),
      ]);

      // Process orders data
      const ordersData = ordersRes.data?.data?.data || [];
      const orderStats = ordersRes.data?.stats || {};
      
      // Lọc đơn hàng theo thời gian
      const filteredOrders = filterOrdersByDate(ordersData);
      const previousRange = getPreviousDateRange();
      const previousOrders = previousRange 
        ? ordersData.filter((order: any) => {
            const orderDate = dayjs(order.created_at);
            return orderDate.isAfter(previousRange.startDate) && orderDate.isBefore(previousRange.endDate);
          })
        : [];
      
      // Tính doanh thu hiện tại và trước đó
      const currentRevenue = filteredOrders.reduce((sum: number, order: any) => {
        return sum + parseFloat(order.final_amount || order.total_amount || 0);
      }, 0);
      
      const prevRevenue = previousOrders.reduce((sum: number, order: any) => {
        return sum + parseFloat(order.final_amount || order.total_amount || 0);
      }, 0);
      
      setPreviousRevenue(prevRevenue);
      
      console.log('Orders Response:', ordersRes.data);
      console.log('Order Stats:', orderStats);
      console.log('Filtered Orders:', filteredOrders.length);
      console.log('Current Revenue:', currentRevenue);
      console.log('Previous Revenue:', prevRevenue);
      
      // Process products data
      const products = Array.isArray(productsRes.data?.data) 
        ? productsRes.data.data 
        : productsRes.data?.data?.data || [];
      
      // Đếm sản phẩm có biến thể - xử lý nhiều kiểu dữ liệu
      const productsWithVariants = products.filter((p: any) => {
        // Kiểm tra có variants array và length > 0
        if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
          return true;
        }
        // Hoặc kiểm tra variation_status (có thể là boolean, number, hoặc string)
        if (p.variation_status === true || 
            p.variation_status === 1 || 
            p.variation_status === "1") {
          return true;
        }
        return false;
      }).length;
      
      console.log('Products:', products.length);
      console.log('Products with variants:', productsWithVariants);
      console.log('Sample product:', products[0]);

      // Process categories data
      const categories = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : categoriesRes.data?.data?.data || [];

      // Process users data
      const users = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.users || usersRes.data?.data || [];
      const activeUsers = users.filter((u: any) => u.status === "active").length;
      const adminUsers = users.filter((u: any) => u.role === "admin").length;

      // Process coupons data
      const couponsData = Array.isArray(couponsRes.data)
        ? couponsRes.data
        : Array.isArray(couponsRes.data?.data)
          ? couponsRes.data.data
          : couponsRes.data?.data?.data || [];
      
      const activeCoupons = couponsData.filter((c: any) => c.is_active).length;
      const totalCouponUsage = couponsData.reduce((sum: number, c: any) => sum + (c.used_count || 0), 0);

      setStats({
        total_orders: timeFilter === "all" ? (orderStats.total_orders || ordersData.length) : filteredOrders.length,
        total_revenue: timeFilter === "all" ? (orderStats.total_revenue || 0) : currentRevenue,
        pending_orders: filteredOrders.filter((o: any) => o.shipping?.shipping_status === 'pending').length,
        confirmed_orders: filteredOrders.filter((o: any) => o.shipping?.shipping_status === 'in_transit').length,
        delivered_orders: filteredOrders.filter((o: any) => o.shipping?.shipping_status === 'delivered').length,
        cancelled_orders: filteredOrders.filter((o: any) => o.shipping?.shipping_status === 'none').length,
        total_products: products.length,
        total_categories: categories.length,
        products_with_variants: productsWithVariants,
        total_users: users.length,
        active_users: activeUsers,
        admin_users: adminUsers,
        total_coupons: couponsData.length,
        active_coupons: activeCoupons,
        total_coupon_usage: totalCouponUsage,
      });

      // Recent orders (top 5 từ filtered)
      setRecentOrders(filteredOrders.slice(0, 5));

      // Calculate top products from filtered orders
      const productSales: { [key: string]: { name: string; total_sold: number; revenue: number } } = {};
      
      filteredOrders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const productName = item.product_name || 'Sản phẩm';
            const quantity = item.quantity || 0;
            const price = parseFloat(item.price || '0');
            const total = item.total || (quantity * price);
            
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
      
      // Chuyển đổi thành mảng và sắp xếp theo doanh thu
      const topProductsArray = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((item, index) => ({
          id: index + 1,
          name: item.name,
          total_sold: item.total_sold,
          revenue: item.revenue,
        }));
      
      setTopProducts(topProductsArray);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const paymentStatusMap: Record<string, { text: string; color: string }> = {
    unpaid: { text: "Chưa thanh toán", color: "red" },
    paid: { text: "Đã thanh toán", color: "green" },
    refunded: { text: "Đã hoàn tiền", color: "orange" },
    failed: { text: "Thất bại", color: "volcano" },
  };

  const paymentMethodMap: Record<string, string> = {
    cod: "COD",
    vnpay: "VNPay",
    bank_transfer: "Chuyển khoản",
  };

  // Calculate percentages
  const orderCompletionRate = stats && stats.total_orders > 0
    ? Math.round((stats.delivered_orders / stats.total_orders) * 100)
    : 0;

  const userActiveRate = stats && stats.total_users > 0
    ? Math.round((stats.active_users / stats.total_users) * 100)
    : 0;

  const couponUsageRate = stats && stats.total_coupons > 0
    ? Math.round((stats.active_coupons / stats.total_coupons) * 100)
    : 0;

  // Tính phần trăm tăng trưởng doanh thu
  const revenueGrowth = previousRevenue > 0
    ? (((stats?.total_revenue || 0) - previousRevenue) / previousRevenue) * 100
    : 0;

  const isRevenueGrowthPositive = revenueGrowth >= 0;

  const orderColumns: ColumnsType<RecentOrder> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => record.user?.name || `#${record.id}`,
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (amount: number) => `${amount?.toLocaleString("vi-VN")}₫`,
    },
    {
      title: "PT Thanh toán",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 130,
      align: "center",
      render: (method: string) => {
        const color = method === "cod" ? "orange" : method === "vnpay" ? "blue" : "green";
        return <Tag color={color}>{paymentMethodMap[method] || method}</Tag>;
      },
    },
    {
      title: "Thanh toán",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status: string) => {
        const info = paymentStatusMap[status] || { text: status, color: "default" };
        return <Badge color={info.color} text={info.text} />;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh" }}>
        <div style={{ marginTop: "20vh" }}>
          <div className="loading-spinner" style={{
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #1890ff",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }} />
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

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <TrophyOutlined style={{ color: "#1890ff" }} />
              Dashboard - Tổng quan hệ thống
            </Title>
            <Text type="secondary">Cập nhật: {dayjs().format("HH:mm - DD/MM/YYYY")}</Text>
          </Col>
          <Col>
            <Space size="middle">
              <Select
                value={timeFilter}
                onChange={(value) => {
                  setTimeFilter(value);
                  if (value !== "custom") {
                    setDateRange(null);
                  }
                }}
                style={{ width: 180 }}
                size="large"
                suffixIcon={<CalendarOutlined />}
              >
                <Select.Option value="all">Tất cả thời gian</Select.Option>
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
              title="Tổng đơn hàng"
              value={stats.total_orders}
              prefix={<ShoppingOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
            <Progress 
              percent={orderCompletionRate} 
              size="small" 
              status="active"
              format={() => `${orderCompletionRate}% hoàn thành`}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={stats.total_revenue}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              suffix="₫"
              valueStyle={{ color: "#52c41a" }}
              formatter={(value) => `${Number(value).toLocaleString("vi-VN")}`}
            />
            {timeFilter !== "all" && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                {isRevenueGrowthPositive ? (
                  <RiseOutlined style={{ color: "#52c41a" }} />
                ) : (
                  <FallOutlined style={{ color: "#ff4d4f" }} />
                )}
                <Text 
                  type={isRevenueGrowthPositive ? "success" : "danger"} 
                  style={{ fontSize: 12 }}
                >
                  {isRevenueGrowthPositive ? "+" : ""}{revenueGrowth.toFixed(1)}% so với kỳ trước
                </Text>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng sản phẩm"
              value={stats.total_products}
              prefix={<AppstoreOutlined style={{ color: "#fa8c16" }} />}
              valueStyle={{ color: "#fa8c16" }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stats.products_with_variants} sản phẩm có biến thể
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Người dùng"
              value={stats.total_users}
              prefix={<UserOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1" }}
            />
            <Progress 
              percent={userActiveRate} 
              size="small"
              strokeColor="#722ed1"
              format={() => `${userActiveRate}% hoạt động`}
            />
          </Card>
        </Col>
      </Row>

      {/* Secondary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text type="secondary">Trạng thái đơn hàng</Text>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
                  <Text>Đã giao:</Text>
                </Space>
                <Text strong style={{ color: "#52c41a" }}>{stats.delivered_orders}</Text>
              </Space>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <ClockCircleOutlined style={{ color: "#faad14", fontSize: 18 }} />
                  <Text>Đang chờ:</Text>
                </Space>
                <Text strong style={{ color: "#faad14" }}>{stats.pending_orders}</Text>
              </Space>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />
                  <Text>Đã hủy:</Text>
                </Space>
                <Text strong style={{ color: "#ff4d4f" }}>{stats.cancelled_orders}</Text>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text type="secondary">Danh mục & Sản phẩm</Text>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <TagsOutlined style={{ color: "#1890ff", fontSize: 18 }} />
                  <Text>Danh mục:</Text>
                </Space>
                <Text strong>{stats.total_categories}</Text>
              </Space>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <AppstoreOutlined style={{ color: "#fa8c16", fontSize: 18 }} />
                  <Text>Sản phẩm:</Text>
                </Space>
                <Text strong>{stats.total_products}</Text>
              </Space>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <FireOutlined style={{ color: "#f5222d", fontSize: 18 }} />
                  <Text>Có biến thể:</Text>
                </Space>
                <Text strong style={{ color: "#f5222d" }}>{stats.products_with_variants}</Text>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text type="secondary">Coupon & Khuyến mãi</Text>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <GiftOutlined style={{ color: "#eb2f96", fontSize: 18 }} />
                  <Text>Tổng coupon:</Text>
                </Space>
                <Text strong>{stats.total_coupons}</Text>
              </Space>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
                  <Text>Đang hoạt động:</Text>
                </Space>
                <Text strong style={{ color: "#52c41a" }}>{stats.active_coupons}</Text>
              </Space>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  <TeamOutlined style={{ color: "#1890ff", fontSize: 18 }} />
                  <Text>Lượt sử dụng:</Text>
                </Space>
                <Text strong style={{ color: "#1890ff" }}>{stats.total_coupon_usage}</Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Charts and Tables */}
      <Row gutter={[16, 16]}>
        {/* Recent Orders */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <ShoppingOutlined style={{ color: "#1890ff" }} />
                Đơn hàng gần đây
              </Space>
            }
          >
            <Table
              columns={orderColumns}
              dataSource={recentOrders}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: "Chưa có đơn hàng" }}
            />
          </Card>
        </Col>

        {/* Top Products */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <FireOutlined style={{ color: "#f5222d" }} />
                Top sản phẩm bán chạy
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
                          backgroundColor: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : index === 2 ? "#cd7f32" : "#1890ff" 
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={<Text strong>{item.name}</Text>}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Đã bán: {item.total_sold} sản phẩm
                        </Text>
                        <Text style={{ fontSize: 12, color: "#52c41a" }}>
                          {item.revenue.toLocaleString("vi-VN")}₫
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Chưa có dữ liệu" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Stats Grid */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Đơn xác nhận"
              value={stats.confirmed_orders}
              valueStyle={{ fontSize: 20, color: "#13c2c2" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Người dùng hoạt động"
              value={stats.active_users}
              valueStyle={{ fontSize: 20, color: "#722ed1" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Quản trị viên"
              value={stats.admin_users}
              valueStyle={{ fontSize: 20, color: "#fa541c" }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Coupon hoạt động"
              value={stats.active_coupons}
              valueStyle={{ fontSize: 20, color: "#eb2f96" }}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;