import React, { useEffect, useState } from "react";
import { Table, Button, Typography, message, Card, Row, Col, Statistic, Tag, Input, Select, Space } from "antd";
import { EyeOutlined, DollarOutlined, ShoppingOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, ReloadOutlined, CarOutlined, CreditCardOutlined } from "@ant-design/icons";
import axios from "axios";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;
const { Search } = Input;

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
  unpaid_orders: number;
  paid_orders: number;
  refunded_orders: number;
  refund_processing_orders: number;
  failed_orders: number;
  total_refunded: number;
}

const API_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";

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
  received: "Đã nhận hàng",
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
  received: "lime",
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
  const [skuSearch, setSkuSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("");
  const [shippingStatusFilter, setShippingStatusFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const navigate = useNavigate();

  const fetchOrders = async (page: number = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page: page,
        per_page: 20
      };
      
      if (skuSearch.trim()) {
        params.sku = skuSearch.trim();
      }
      
      if (paymentStatusFilter) {
        params.payment_status = paymentStatusFilter;
      }

      if (shippingStatusFilter) {
        params.shipping_status = shippingStatusFilter;
      }

      if (paymentMethodFilter) {
        params.payment_method = paymentMethodFilter;
      }

      const res = await axios.get(`${API_URL}/admin/orders-admin`, {
        headers: { Authorization: `Bearer ${token}` },
        params
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

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders(1);
  };

  const handleReset = () => {
    setSkuSearch("");
    setPaymentStatusFilter("");
    setShippingStatusFilter("");
    setPaymentMethodFilter("");
    setCurrentPage(1);
    setTimeout(() => {
      fetchOrders(1);
    }, 100);
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "0 ₫";
    const numAmount = Math.round(Number(amount));
    return `${numAmount.toLocaleString("vi-VN")} ₫`;
  };

  const getStatusCount = (status: string): number => {
    if (!stats) return 0;
    
    switch(status) {
      case 'unpaid':
        return stats.unpaid_orders || 0;
      case 'paid':
        return stats.paid_orders || 0;
      case 'refunded':
        return stats.refunded_orders || 0;
      case 'refund_processing':
        return stats.refund_processing_orders || 0;
      case 'failed':
        return stats.failed_orders || 0;
      default:
        return 0;
    }
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
      width: 140,
      fixed: "left"
    },
    {
      title: "Phương thức TT",
      key: "payment_method",
      width: 180,
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
      width: 180,
      render: (_, record) => (
        <Tag color={shippingStatusColors[record.shipping?.shipping_status || 'none'] || "default"}>
          {shippingStatusMap[record.shipping?.shipping_status || 'none'] || "—"}
        </Tag>
      ),
    },
    {
      title: "Tổng tiền",
      key: "total",
      align: "right",
      width: 140,
      render: (_, record) => formatCurrency(record.final_amount ?? record.total_amount),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => navigate(`/admin/orders/${record.id}`)}
          size="small"
          type="primary"
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <Title level={3}>📦 Quản lý đơn hàng</Title>

      {/* Thống kê tổng quan */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="Tổng đơn hàng"
                value={stats.total_orders}
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
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
        </Row>
      )}

      {/* Chi tiết trạng thái thanh toán */}
      <Card style={{ marginBottom: 16 }} title="📊 Thống kê chi tiết trạng thái thanh toán">
        <Row gutter={[16, 16]}>
          {Object.entries(paymentStatusMap).map(([key, label]) => {
            const count = getStatusCount(key);
            const color = paymentStatusColors[key];
            
            return (
              <Col xs={12} sm={8} md={6} lg={4} key={key}>
                <Card 
                  size="small" 
                  style={{ 
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    border: paymentStatusFilter === key ? `2px solid ${color === 'green' ? '#52c41a' : color === 'red' ? '#ff4d4f' : '#1890ff'}` : undefined
                  }}
                  hoverable
                  onClick={() => {
                    const newFilter = paymentStatusFilter === key ? "" : key;
                    setPaymentStatusFilter(newFilter);
                    setCurrentPage(1);
                    setTimeout(() => {
                      const params: any = {
                        page: 1,
                        per_page: 20
                      };
                      
                      if (skuSearch.trim()) {
                        params.sku = skuSearch.trim();
                      }
                      
                      if (newFilter) {
                        params.payment_status = newFilter;
                      }

                      if (shippingStatusFilter) {
                        params.shipping_status = shippingStatusFilter;
                      }

                      if (paymentMethodFilter) {
                        params.payment_method = paymentMethodFilter;
                      }

                      setLoading(true);
                      axios.get(`${API_URL}/admin/orders-admin`, {
                        headers: { Authorization: `Bearer ${token}` },
                        params
                      })
                      .then(res => {
                        const ordersData = res.data?.data?.data || [];
                        const statsData = res.data?.stats || null;
                        const totalData = res.data?.data?.total || 0;

                        setOrders(ordersData);
                        setStats(statsData);
                        setTotal(totalData);
                        setCurrentPage(1);
                      })
                      .catch(err => {
                        message.error("Không tải được danh sách đơn hàng");
                        console.error("Error fetching orders:", err);
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                    }, 0);
                  }}
                >
                  <Tag color={color} style={{ marginBottom: 8, fontSize: 13 }}>
                    {label}
                  </Tag>
                  <div style={{ 
                    fontSize: 24, 
                    fontWeight: "bold", 
                    color: color === 'green' ? '#52c41a' : color === 'red' ? '#ff4d4f' : color === 'purple' ? '#722ed1' : color === 'orange' ? '#fa8c16' : '#000' 
                  }}>
                    {count}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Bộ lọc */}
      <Card style={{ marginBottom: 16 }} title="🔍 Bộ lọc đơn hàng">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Search
                placeholder="Nhập mã SKU"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                onSearch={handleSearch}
                enterButton={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Trạng thái thanh toán"
                value={paymentStatusFilter || undefined}
                onChange={(value) => setPaymentStatusFilter(value || "")}
                style={{ width: "100%" }}
                allowClear
                suffixIcon={<CreditCardOutlined />}
              >
                {Object.entries(paymentStatusMap).map(([key, label]) => (
                  <Select.Option key={key} value={key}>
                    <Tag color={paymentStatusColors[key]}>{label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Trạng thái vận chuyển"
                value={shippingStatusFilter || undefined}
                onChange={(value) => setShippingStatusFilter(value || "")}
                style={{ width: "100%" }}
                allowClear
                suffixIcon={<CarOutlined />}
              >
                {Object.entries(shippingStatusMap).map(([key, label]) => (
                  <Select.Option key={key} value={key}>
                    <Tag color={shippingStatusColors[key]}>{label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Phương thức thanh toán"
                value={paymentMethodFilter || undefined}
                onChange={(value) => setPaymentMethodFilter(value || "")}
                style={{ width: "100%" }}
                allowClear
              >
                {Object.entries(paymentMethodMap).map(([key, label]) => (
                  <Select.Option key={key} value={key}>
                    <Tag color={paymentMethodColors[key]}>{label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Áp dụng lọc
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Đặt lại
                </Button>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Bảng đơn hàng */}
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
            onChange: (page) => {
              setCurrentPage(page);
              fetchOrders(page);
            }
          }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default OrderList;