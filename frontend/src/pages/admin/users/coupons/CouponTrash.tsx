import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  message,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Drawer,
  Divider,
  Typography,
  Popconfirm,
  Empty,
  Input,
  Select,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  PercentageOutlined,
  DollarOutlined,
  CalendarOutlined,
  EyeOutlined,
  RollbackOutlined,
  DeleteOutlined,
  DeleteFilled,
  TagsOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Option } = Select;
const { Title, Text } = Typography;

interface Coupon {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

const CouponTrashList: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTrashedCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/coupons/trash`, { headers });
      const data =
        Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.data || [];
      setCoupons(data);
    } catch (err) {
      console.error("❌ Lỗi tải thùng rác:", err);
      message.error("Không thể tải danh sách thùng rác!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashedCoupons();
  }, []);

  const stats = useMemo(() => {
    return {
      total: coupons.length,
      percent: coupons.filter((c) => c.discount_type === "percent").length,
      fixed: coupons.filter((c) => c.discount_type === "fixed").length,
    };
  }, [coupons]);

  const dataView = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = coupons.filter((c) => {
      const matchSearch = c.code.toLowerCase().includes(q);
      const matchType =
        filterType === "all" || c.discount_type === filterType;
      return matchSearch && matchType;
    });
    return list.sort(
      (a, b) => dayjs(b.deleted_at).valueOf() - dayjs(a.deleted_at).valueOf()
    );
  }, [coupons, searchText, filterType]);

  const handleRestore = async (id: number) => {
    try {
      await axios.post(`${API_URL}/admin/coupons/${id}/restore`, {}, { headers });
      message.success("Đã khôi phục coupon!");
      fetchTrashedCoupons();
    } catch (err) {
      console.error(err);
      message.error("Không thể khôi phục coupon!");
    }
  };

  const handlePermanentDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/coupons/${id}/force`, { headers });
      message.success("Đã xóa vĩnh viễn coupon!");
      fetchTrashedCoupons();
    } catch (err) {
      console.error(err);
      message.error("Không thể xóa vĩnh viễn coupon!");
    }
  };

  const openDrawer = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: "Mã Coupon",
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (code: string) => (
        <Space size={4}>
          <TagsOutlined style={{ color: "#ff4d4f", fontSize: 12 }} />
          <Text strong delete style={{ fontSize: 13, color: "#8c8c8c" }}>
            {code}
          </Text>
        </Space>
      ),
    },
    {
      title: "Loại giảm",
      dataIndex: "discount_type",
      key: "discount_type",
      width: 110,
      align: "center" as const,
      render: (type: string) =>
        type === "percent" ? (
          <Tag icon={<PercentageOutlined style={{ fontSize: 11 }} />} color="default" style={{ fontSize: 12, padding: "2px 8px" }}>
            Phần trăm
          </Tag>
        ) : (
          <Tag icon={<DollarOutlined style={{ fontSize: 11 }} />} color="default" style={{ fontSize: 12, padding: "2px 8px" }}>
            VNĐ
          </Tag>
        ),
    },
    {
      title: "Giá trị",
      dataIndex: "discount_value",
      key: "discount_value",
      width: 100,
      align: "right" as const,
      render: (v: number, r: Coupon) => (
        <Text type="secondary" style={{ fontSize: 14 }}>
          {r.discount_type === "percent"
            ? `${v}%`
            : `${Math.round(v).toLocaleString('vi-VN')}₫`}
        </Text>
      ),
    },
    {
      title: "Thời gian",
      key: "date_range",
      width: 160,
      render: (r: Coupon) =>
        r.start_date && r.end_date ? (
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <CalendarOutlined style={{ marginRight: 4, fontSize: 11 }} />
              {dayjs(r.start_date).format("DD/MM/YYYY")}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, paddingLeft: 15 }}>
              → {dayjs(r.end_date).format("DD/MM/YYYY")}
            </Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <CalendarOutlined style={{ marginRight: 4, fontSize: 11 }} />
            Không giới hạn
          </Text>
        ),
    },
    {
      title: "Ngày xóa",
      dataIndex: "deleted_at",
      key: "deleted_at",
      width: 130,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(text).format("HH:mm DD/MM/YY")}
        </Text>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200,
      align: "center" as const,
      fixed: "right" as const,
      render: (_: any, record: Coupon) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ fontSize: 12 }} />}
            onClick={() => openDrawer(record)}
            style={{ color: "#1890ff", fontSize: 12, padding: "0 8px" }}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title="Xác nhận khôi phục"
            description={`Khôi phục coupon "${record.code}" về danh sách?`}
            okText="Khôi phục"
            cancelText="Hủy"
            okButtonProps={{ size: "small" }}
            cancelButtonProps={{ size: "small" }}
            onConfirm={() => handleRestore(record.id)}
          >
            <Button
              type="text"
              size="small"
              icon={<RollbackOutlined style={{ fontSize: 12 }} />}
              style={{ color: "#52c41a", fontSize: 12, padding: "0 8px" }}
            >
              Khôi phục
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Xóa vĩnh viễn?"
            description={`Coupon "${record.code}" sẽ bị xóa hoàn toàn!`}
            okText="Xóa vĩnh viễn"
            cancelText="Hủy"
            okButtonProps={{ danger: true, size: "small" }}
            cancelButtonProps={{ size: "small" }}
            onConfirm={() => handlePermanentDelete(record.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined style={{ fontSize: 12 }} />}
              style={{ fontSize: 12, padding: "0 8px" }}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title
          level={2}
          style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}
        >
          <DeleteFilled style={{ color: "#ff4d4f" }} />
          Thùng rác Coupon
        </Title>
        <Text type="secondary">
          Quản lý các coupon đã xóa - Khôi phục hoặc xóa vĩnh viễn
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng trong thùng rác"
              value={stats.total}
              prefix={<DeleteFilled />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Loại phần trăm"
              value={stats.percent}
              prefix={<PercentageOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Loại VNĐ"
              value={stats.fixed}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Input
              placeholder="Tìm kiếm theo mã coupon..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} md={12}>
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: "100%" }}
              size="large"
              placeholder="Loại giảm"
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">Tất cả loại</Option>
              <Option value="percent">Phần trăm</Option>
              <Option value="fixed">VNĐ</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={dataView}
          loading={loading}
          pagination={{
            pageSize,
            current: currentPage,
            onChange: setCurrentPage,
            showTotal: (t) => `Tổng số ${t} coupon đã xóa`,
            showSizeChanger: false,
          }}
          locale={{
            emptyText: (
              <Empty
                description="Thùng rác trống"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          scroll={{ x: 1000 }}
          size="small"
        />
      </Card>

      {/* Drawer Detail */}
      <Drawer
        title={
          <Space>
            <DeleteFilled style={{ color: "#ff4d4f", fontSize: 20 }} />
            <span style={{ fontSize: 18 }}>Chi tiết Coupon đã xóa</span>
          </Space>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={480}
      >
        {selectedCoupon && (
          <div>
            <Card style={{ marginBottom: 16, background: "#fff1f0" }}>
              <Space
                direction="vertical"
                size={8}
                style={{ width: "100%" }}
              >
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary">Mã Coupon</Text>
                  <Title
                    level={3}
                    delete
                    copyable
                    style={{ margin: "8px 0", color: "#ff4d4f" }}
                  >
                    {selectedCoupon.code}
                  </Title>
                </div>
                <Divider style={{ margin: "12px 0" }} />
                <div style={{ textAlign: "center" }}>
                  <Text>
                    <strong>Giá trị giảm</strong>
                  </Text>
                  <Title
                    level={2}
                    style={{ margin: "8px 0", color: "#ff7875" }}
                  >
                    {selectedCoupon.discount_type === "percent"
                      ? `${selectedCoupon.discount_value}%`
                      : `${Math.round(selectedCoupon.discount_value).toLocaleString('vi-VN')}₫`}
                  </Title>
                </div>
              </Space>
            </Card>

            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Loại giảm giá
                </Text>
                <div style={{ marginTop: 8 }}>
                  {selectedCoupon.discount_type === "percent" ? (
                    <Tag
                      icon={<PercentageOutlined />}
                      color="default"
                      style={{ fontSize: 14, padding: "4px 12px" }}
                    >
                      Giảm theo phần trăm
                    </Tag>
                  ) : (
                    <Tag
                      icon={<DollarOutlined />}
                      color="default"
                      style={{ fontSize: 14, padding: "4px 12px" }}
                    >
                      Giảm theo VNĐ
                    </Tag>
                  )}
                </div>
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <CalendarOutlined /> Thời gian áp dụng
                </Text>
                <div style={{ marginTop: 8 }}>
                  {selectedCoupon.start_date && selectedCoupon.end_date ? (
                    <Space direction="vertical" size={4}>
                      <Text>
                        <strong>Bắt đầu:</strong>{" "}
                        {dayjs(selectedCoupon.start_date).format(
                          "HH:mm - DD/MM/YYYY"
                        )}
                      </Text>
                      <Text>
                        <strong>Kết thúc:</strong>{" "}
                        {dayjs(selectedCoupon.end_date).format(
                          "HH:mm - DD/MM/YYYY"
                        )}
                      </Text>
                    </Space>
                  ) : (
                    <Text>Không giới hạn thời gian</Text>
                  )}
                </div>
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Trạng thái trước khi xóa
                </Text>
                <div style={{ marginTop: 8 }}>
                  {selectedCoupon.is_active ? (
                    <Badge
                      status="success"
                      text="Đang hoạt động"
                      style={{ fontSize: 14 }}
                    />
                  ) : (
                    <Badge
                      status="error"
                      text="Ngừng hoạt động"
                      style={{ fontSize: 14 }}
                    />
                  )}
                </div>
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Space
                  direction="vertical"
                  size={4}
                  style={{ width: "100%" }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Ngày tạo:{" "}
                    {dayjs(selectedCoupon.created_at).format(
                      "HH:mm - DD/MM/YYYY"
                    )}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Ngày xóa:{" "}
                    {dayjs(selectedCoupon.deleted_at).format(
                      "HH:mm - DD/MM/YYYY"
                    )}
                  </Text>
                </Space>
              </div>
            </Space>

            <Divider />

            <Space style={{ width: "100%", justifyContent: "center" }}>
              <Popconfirm
                title="Xác nhận khôi phục"
                description={`Khôi phục coupon "${selectedCoupon.code}" về danh sách?`}
                okText="Khôi phục"
                cancelText="Hủy"
                onConfirm={() => {
                  handleRestore(selectedCoupon.id);
                  setDrawerVisible(false);
                }}
              >
                <Button
                  type="primary"
                  icon={<RollbackOutlined />}
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}
                >
                  Khôi phục
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Xóa vĩnh viễn?"
                description="Coupon sẽ bị xóa hoàn toàn và không thể khôi phục!"
                okText="Xóa vĩnh viễn"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => {
                  handlePermanentDelete(selectedCoupon.id);
                  setDrawerVisible(false);
                }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Xóa vĩnh viễn
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CouponTrashList;