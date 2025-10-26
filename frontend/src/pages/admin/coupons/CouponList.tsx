import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
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
  Switch,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  PercentageOutlined,
  DollarOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TagsOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Option } = Select;
const { RangePicker } = DatePicker;
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
}

const CouponList: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const [form] = Form.useForm();

  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/coupons`, { headers });
      const data =
        Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.data || [];
      setCoupons(data);
    } catch (err) {
      console.error("❌ Lỗi tải coupon:", err);
      message.error("Không thể tải danh sách coupon!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const stats = useMemo(() => {
    return {
      total: coupons.length,
      active: coupons.filter((c) => c.is_active).length,
      inactive: coupons.filter((c) => !c.is_active).length,
    };
  }, [coupons]);

  const dataView = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = coupons.filter((c) => {
      const matchSearch = c.code.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && c.is_active) ||
        (filterStatus === "inactive" && !c.is_active);
      const matchType =
        filterType === "all" || c.discount_type === filterType;
      return matchSearch && matchStatus && matchType;
    });
    return list.sort(
      (a, b) => dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
    );
  }, [coupons, searchText, filterStatus, filterType]);

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      form.setFieldsValue({
        ...coupon,
        dateRange:
          coupon.start_date && coupon.end_date
            ? [dayjs(coupon.start_date), dayjs(coupon.end_date)]
            : [],
      });
    } else {
      setEditingCoupon(null);
      form.resetFields();
      // Generate random coupon code: 9 characters (uppercase letters + numbers)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomCode = '';
      for (let i = 0; i < 9; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      form.setFieldsValue({ 
        is_active: true,
        code: randomCode 
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        code: values.code,
        discount_type: values.discount_type,
        discount_value: values.discount_value,
        min_purchase: values.min_purchase || null,
        max_discount: values.max_discount || null,
        start_date: values.dateRange?.[0]
          ? dayjs(values.dateRange[0]).format("YYYY-MM-DD HH:mm:ss")
          : null,
        end_date: values.dateRange?.[1]
          ? dayjs(values.dateRange[1]).format("YYYY-MM-DD HH:mm:ss")
          : null,
        is_active: values.is_active ?? true,
      };

      if (editingCoupon) {
        await axios.put(
          `${API_URL}/admin/coupons/${editingCoupon.id}`,
          payload,
          { headers }
        );
        message.success("Cập nhật coupon thành công!");
      } else {
        await axios.post(`${API_URL}/admin/coupons`, payload, { headers });
        message.success("Thêm coupon thành công!");
      }

      setModalVisible(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      message.error("Không thể lưu coupon!");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/coupons/${id}`, { headers });
      message.success("Đã xóa coupon!");
      fetchCoupons();
    } catch (err) {
      console.error(err);
      message.error("Không thể xóa coupon!");
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
          <TagsOutlined style={{ color: "#1890ff", fontSize: 12 }} />
          <Text strong copyable style={{ fontSize: 13 }}>
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
          <Tag icon={<PercentageOutlined style={{ fontSize: 11 }} />} color="purple" style={{ fontSize: 12, padding: "2px 8px" }}>
            Phần trăm
          </Tag>
        ) : (
          <Tag icon={<DollarOutlined style={{ fontSize: 11 }} />} color="green" style={{ fontSize: 12, padding: "2px 8px" }}>
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
        <Text strong style={{ color: "#f5222d", fontSize: 14 }}>
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
            <Text style={{ fontSize: 12 }}>
              <CalendarOutlined style={{ marginRight: 4, color: "#1890ff", fontSize: 11 }} />
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
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      align: "center" as const,
      render: (active: boolean) =>
        active ? (
          <Badge status="success" text={<span style={{ fontSize: 12 }}>Hoạt động</span>} />
        ) : (
          <Badge status="error" text={<span style={{ fontSize: 12 }}>Ngưng</span>} />
        ),
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      key: "updated_at",
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
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ fontSize: 12 }} />}
            onClick={() => openModal(record)}
            style={{ color: "#52c41a", fontSize: 12, padding: "0 8px" }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Bạn có chắc muốn xóa coupon "${record.code}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, size: "small" }}
            cancelButtonProps={{ size: "small" }}
            onConfirm={() => handleDelete(record.id)}
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
          <GiftOutlined style={{ color: "#1890ff" }} />
          Quản lý Coupon
        </Title>
        <Text type="secondary">
          Tạo và quản lý mã giảm giá cho khách hàng
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng số Coupon"
              value={stats.total}
              prefix={<TagsOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ngừng hoạt động"
              value={stats.inactive}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Tìm kiếm theo mã coupon..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: "100%" }}
              size="large"
              placeholder="Trạng thái"
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">Tất cả</Option>
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Ngừng</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: "100%" }}
              size="large"
              placeholder="Loại giảm"
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">Tất cả</Option>
              <Option value="percent">Phần trăm</Option>
              <Option value="fixed">Cố định</Option>
            </Select>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
              style={{ fontWeight: 500 }}
            >
              Tạo Coupon mới
            </Button>
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
            showTotal: (t) => `Tổng số ${t} coupon`,
            showSizeChanger: false,
          }}
          locale={{
            emptyText: (
              <Empty
                description="Chưa có coupon nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          scroll={{ x: 1000 }}
          size="small"
        />
      </Card>

      {/* Modal Create/Edit */}
      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: "#1890ff" }} />
            <span>
              {editingCoupon ? "Chỉnh sửa Coupon" : "Tạo Coupon mới"}
            </span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        okButtonProps={{ size: "middle" }}
        cancelButtonProps={{ size: "middle" }}
        styles={{
          body: { padding: "16px 24px" }
        }}
      >
        <Divider style={{ margin: "12px 0" }} />
        <Form form={form} layout="vertical" size="middle">
          <Form.Item
            label="Mã Coupon"
            name="code"
            rules={[
              { required: true, message: "Vui lòng nhập mã coupon!" },
              { min: 3, message: "Mã coupon phải có ít nhất 3 ký tự!" },
            ]}
          >
            <Input
              placeholder="VD: SALE2025"
              prefix={<TagsOutlined />}
              style={{ textTransform: "uppercase" }}
              disabled
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Loại giảm giá"
                name="discount_type"
                rules={[{ required: true, message: "Chọn loại giảm giá!" }]}
              >
                <Select placeholder="Chọn loại">
                  <Option value="percent">
                    <Space>
                      <PercentageOutlined />
                      Phần trăm (%)
                    </Space>
                  </Option>
                  <Option value="fixed">
                    <Space>
                      <DollarOutlined />
                      Cố định (VNĐ)
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Giá trị giảm"
                name="discount_value"
                dependencies={["discount_type"]}
                rules={[
                  { required: true, message: "Nhập giá trị giảm!" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const discountType = getFieldValue("discount_type");
                      if (!value) return Promise.resolve();

                      if (discountType === "percent") {
                        if (value > 100) {
                          return Promise.reject(
                            new Error("Giá trị % không được quá 100!")
                          );
                        }
                        if (value <= 0) {
                          return Promise.reject(
                            new Error("Giá trị phải lớn hơn 0!")
                          );
                        }
                      } else if (discountType === "fixed") {
                        if (value < 1000) {
                          return Promise.reject(
                            new Error("Giá trị phải từ 1.000đ trở lên!")
                          );
                        }
                      }

                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(value) => {
                    const discountType = form.getFieldValue("discount_type");
                    if (discountType === "fixed" && value) {
                      return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    }
                    return `${value}`;
                  }}
                  parser={(value) => (value?.replace(/\./g, "") || "0") as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Đơn hàng tối thiểu" name="min_purchase">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                  }
                  parser={(value) => (value?.replace(/\./g, "") || "0") as any}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Giảm tối đa" name="max_discount">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="Không giới hạn"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                  }
                  parser={(value) => (value?.replace(/\./g, "") || "0") as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Thời gian áp dụng"
            name="dateRange"
            tooltip="Để trống nếu không giới hạn thời gian"
          >
            <RangePicker
              showTime
              style={{ width: "100%" }}
              placeholder={["Bắt đầu", "Kết thúc"]}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>

          <Form.Item
            label="Trạng thái"
            name="is_active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch
              checkedChildren="Hoạt động"
              unCheckedChildren="Ngưng"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer Detail */}
      <Drawer
        title={
          <Space>
            <GiftOutlined style={{ color: "#1890ff", fontSize: 20 }} />
            <span style={{ fontSize: 18 }}>Chi tiết Coupon</span>
          </Space>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={480}
      >
        {selectedCoupon && (
          <div>
            <Card style={{ marginBottom: 16, background: "#f6f9ff" }}>
              <Space
                direction="vertical"
                size={8}
                style={{ width: "100%" }}
              >
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary">Mã Coupon</Text>
                  <Title
                    level={3}
                    copyable
                    style={{ margin: "8px 0", color: "#1890ff" }}
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
                    style={{ margin: "8px 0", color: "#f5222d" }}
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
                      color="purple"
                      style={{ fontSize: 14, padding: "4px 12px" }}
                    >
                      Giảm theo phần trăm
                    </Tag>
                  ) : (
                    <Tag
                      icon={<DollarOutlined />}
                      color="green"
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
                  Trạng thái
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
                    Cập nhật:{" "}
                    {dayjs(selectedCoupon.updated_at).format(
                      "HH:mm - DD/MM/YYYY"
                    )}
                  </Text>
                </Space>
              </div>
            </Space>

            <Divider />

            <Space style={{ width: "100%", justifyContent: "center" }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  openModal(selectedCoupon);
                }}
              >
                Chỉnh sửa
              </Button>
              <Popconfirm
                title="Xác nhận xóa"
                description="Bạn có chắc muốn xóa coupon này?"
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => {
                  handleDelete(selectedCoupon.id);
                  setDrawerVisible(false);
                }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Xóa
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CouponList;