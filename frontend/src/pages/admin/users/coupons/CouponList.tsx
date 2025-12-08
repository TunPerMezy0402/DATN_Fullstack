import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, message, Modal, Form, Input, InputNumber,
  Select, DatePicker, Tag, Card, Row, Col, Statistic, Badge,
  Drawer, Divider, Typography, Popconfirm, Empty, Switch,
} from "antd";
import {
  PlusOutlined, SearchOutlined, FilterOutlined, PercentageOutlined,
  DollarOutlined, CalendarOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, CheckCircleOutlined, CloseCircleOutlined,
  TagsOutlined, GiftOutlined,
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
  usage_limit?: number;
  used_count?: number;
  created_at: string;
  updated_at: string;
}

const CouponList: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
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
  const discountType = Form.useWatch('discount_type', form);

  // API Configuration
  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
  const headers = { Authorization: `Bearer ${token}` };

  const generateCouponCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 9; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/coupons`, { headers });

      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data.data) {
        data = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data.data || [];
      }

      setCoupons(data);
    } catch (error: any) {
      console.error("Error fetching coupons:", error);
      message.error(error.response?.data?.message || "Không thể tải danh sách coupon!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const statistics = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => c.is_active).length;
    const inactive = total - active;

    return { total, active, inactive };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const searchQuery = searchText.trim().toLowerCase();

    return coupons
      .filter(coupon => {
        const matchesSearch = !searchQuery ||
          coupon.code.toLowerCase().includes(searchQuery);

        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "active" && coupon.is_active) ||
          (filterStatus === "inactive" && !coupon.is_active);

        const matchesType =
          filterType === "all" ||
          coupon.discount_type === filterType;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) =>
        dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      );
  }, [coupons, searchText, filterStatus, filterType]);

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      form.setFieldsValue({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase || undefined,
        max_discount: coupon.discount_type === 'percent' ? (coupon.max_discount || undefined) : undefined,
        usage_limit: coupon.usage_limit || undefined,
        used_count: coupon.used_count || 0,
        is_active: coupon.is_active,
        dateRange: coupon.start_date && coupon.end_date
          ? [dayjs(coupon.start_date), dayjs(coupon.end_date)]
          : undefined,
      });
    } else {
      setEditingCoupon(null);
      form.resetFields();
      form.setFieldsValue({
        code: generateCouponCode(),
        is_active: true,
        discount_type: "percent",
      });
    }
    setModalVisible(true);
  };

  const handleSaveCoupon = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        code: values.code.toUpperCase(),
        discount_type: values.discount_type,
        discount_value: parseFloat(values.discount_value),
        min_purchase: values.min_purchase ? parseFloat(values.min_purchase) : null,
        max_discount: values.discount_type === 'percent'
          ? (values.max_discount ? parseFloat(values.max_discount) : null)
          : parseFloat(values.discount_value),
        usage_limit: values.usage_limit || null,
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
        message.success("Tạo coupon mới thành công!");
      }

      setModalVisible(false);
      form.resetFields();
      fetchCoupons();
    } catch (error: any) {
      console.error("Error saving coupon:", error);

      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat().join(", ");
        message.error(errorMessages);
      } else {
        message.error("Không thể lưu coupon!");
      }
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/coupons/${id}`, { headers });
      message.success("Xóa coupon thành công!");
      fetchCoupons();
    } catch (error: any) {
      console.error("Error deleting coupon:", error);
      message.error(error.response?.data?.message || "Không thể xóa coupon!");
    }
  };

  const handleOpenDrawer = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: "Mã Coupon",
      dataIndex: "code",
      key: "code",
      width: 140,
      fixed: "left" as const,
      render: (code: string) => (
        <Space size={4}>
          <TagsOutlined style={{ color: "#1890ff" }} />
          <Text strong copyable={{ text: code }}>
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
          <Tag icon={<PercentageOutlined />} color="purple">
            Phần trăm
          </Tag>
        ) : (
          <Tag icon={<DollarOutlined />} color="green">
            Cố định
          </Tag>
        ),
    },
    {
      title: "Giá trị",
      dataIndex: "discount_value",
      key: "discount_value",
      width: 120,
      align: "right" as const,
      render: (value: number, record: Coupon) => (
        <Text strong style={{ color: "#f5222d", fontSize: 15 }}>
          {record.discount_type === "percent"
            ? `${value}%`
            : `${Math.round(value).toLocaleString("vi-VN")}₫`}
        </Text>
      ),
    },
    {
      title: "Giới hạn",
      key: "limits",
      width: 140,
      render: (record: Coupon) => (
        <Space direction="vertical" size={2}>
          {record.min_purchase && (
            <Text style={{ fontSize: 12 }}>
              Tối thiểu: {Math.round(record.min_purchase).toLocaleString("vi-VN")}₫
            </Text>
          )}
          {record.discount_type === 'percent' && record.max_discount && (
            <Text style={{ fontSize: 12 }}>
              Giảm tối đa: {Math.round(record.max_discount).toLocaleString("vi-VN")}₫
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Lượt dùng",
      key: "usage",
      width: 100,
      align: "center" as const,
      render: (record: Coupon) => (
        <Text>
          {record.used_count || 0}
          {record.usage_limit ? ` / ${record.usage_limit}` : " / ∞"}
        </Text>
      ),
    },
    {
      title: "Thời gian",
      key: "date_range",
      width: 180,
      render: (record: Coupon) =>
        record.start_date && record.end_date ? (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12 }}>
              <CalendarOutlined style={{ marginRight: 4, color: "#1890ff" }} />
              {dayjs(record.start_date).format("DD/MM/YYYY HH:mm")}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, paddingLeft: 18 }}>
              → {dayjs(record.end_date).format("DD/MM/YYYY HH:mm")}
            </Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Không giới hạn
          </Text>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      align: "center" as const,
      render: (isActive: boolean) =>
        isActive ? (
          <Badge status="success" text="Hoạt động" />
        ) : (
          <Badge status="error" text="Ngưng" />
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
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDrawer(record)}
          >
            Chi tiết
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Bạn có chắc muốn xóa coupon "${record.code}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteCoupon(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <GiftOutlined style={{ color: "#1890ff" }} />
          Quản lý Coupon
        </Title>
        <Text type="secondary">Tạo và quản lý mã giảm giá cho khách hàng</Text>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng số Coupon"
              value={statistics.total}
              prefix={<TagsOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={statistics.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ngừng hoạt động"
              value={statistics.inactive}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

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
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">Tất cả loại</Option>
              <Option value="percent">Phần trăm</Option>
              <Option value="fixed">Cố định</Option>
            </Select>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              Tạo Coupon mới
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredCoupons}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: filteredCoupons.length,
            onChange: setCurrentPage,
            showTotal: (total) => `Tổng số ${total} coupon`,
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
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: "#1890ff" }} />
            {editingCoupon ? "Chỉnh sửa Coupon" : "Tạo Coupon mới"}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={handleSaveCoupon}
        okText="Lưu"
        cancelText="Hủy"
        width={700}
      >
        <Divider style={{ margin: "16px 0" }} />
        <Form form={form} layout="vertical">
          <Form.Item
            label="Mã Coupon"
            name="code"
            rules={[
              { required: true, message: "Vui lòng nhập mã coupon!" },
              { min: 3, message: "Mã coupon phải có ít nhất 3 ký tự!" },
              { pattern: /^[A-Z0-9]+$/, message: "Chỉ chữ in hoa và số!" },
            ]}
          >
            <Input
              placeholder="VD: SALE2025"
              prefix={<TagsOutlined />}
              disabled={!!editingCoupon}
              maxLength={20}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Loại giảm giá"
                name="discount_type"
                rules={[{ required: true, message: "Chọn loại giảm giá!" }]}
              >
                <Select
                  placeholder="Chọn loại"
                  onChange={(value) => {
                    if (value === 'fixed') {
                      form.setFieldsValue({ max_discount: undefined });
                    }
                  }}
                >
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
                      if (!value || value <= 0) {
                        return Promise.reject(new Error("Giá trị phải lớn hơn 0!"));
                      }
                      if (discountType === "percent" && value > 100) {
                        return Promise.reject(new Error("Giá trị % không được quá 100!"));
                      }
                      if (discountType === "fixed" && value < 1000) {
                        return Promise.reject(new Error("Giá trị phải từ 1.000đ trở lên!"));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="Nhập giá trị"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                  }
                  parser={(value) => value?.replace(/\./g, "") as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={discountType === 'percent' ? 12 : 24}>
              <Form.Item
                label="Đơn hàng tối thiểu (VNĐ)"
                name="min_purchase"
                tooltip="Giá trị đơn hàng tối thiểu để áp dụng coupon"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="Không giới hạn"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                  }
                  parser={(value) => value?.replace(/\./g, "") as any}
                />
              </Form.Item>
            </Col>
            {discountType === 'percent' && (
              <Col span={12}>
                <Form.Item
                  label="Giảm tối đa (VNĐ)"
                  name="max_discount"
                  tooltip="Số tiền giảm tối đa (áp dụng cho loại phần trăm)"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="Không giới hạn"
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                    }
                    parser={(value) => value?.replace(/\./g, "") as any}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Giới hạn lượt sử dụng"
                name="usage_limit"
                tooltip="Số lần tối đa mã này có thể được sử dụng"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  placeholder="Không giới hạn"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Đã sử dụng"
                name="used_count"
                tooltip="Số lượt đã được sử dụng (tự động)"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  disabled
                  placeholder="0"
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
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngưng" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          <Space>
            <GiftOutlined style={{ color: "#1890ff" }} />
            Chi tiết Coupon
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
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary">Mã Coupon</Text>
                  <Title level={3} copyable style={{ margin: "8px 0", color: "#1890ff" }}>
                    {selectedCoupon.code}
                  </Title>
                </div>
                <Divider style={{ margin: "12px 0" }} />
                <div style={{ textAlign: "center" }}>
                  <Text><strong>Giá trị giảm</strong></Text>
                  <Title level={2} style={{ margin: "8px 0", color: "#f5222d" }}>
                    {selectedCoupon.discount_type === "percent"
                      ? `${selectedCoupon.discount_value}%`
                      : `${Math.round(selectedCoupon.discount_value).toLocaleString("vi-VN")}₫`}
                  </Title>
                </div>
              </Space>
            </Card>

            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div>
                <Text type="secondary">Loại giảm giá</Text>
                <div style={{ marginTop: 8 }}>
                  {selectedCoupon.discount_type === "percent" ? (
                    <Tag icon={<PercentageOutlined />} color="purple" style={{ padding: "4px 12px" }}>
                      Giảm theo phần trăm
                    </Tag>
                  ) : (
                    <Tag icon={<DollarOutlined />} color="green" style={{ padding: "4px 12px" }}>
                      Giảm theo VNĐ
                    </Tag>
                  )}
                </div>
              </div>

              {(selectedCoupon.min_purchase || selectedCoupon.max_discount) && (
                <>
                  <Divider style={{ margin: 0 }} />
                  <div>
                    <Text type="secondary">Giới hạn</Text>
                    <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
                      {selectedCoupon.min_purchase && (
                        <Text>
                          Đơn tối thiểu: <strong>{Math.round(selectedCoupon.min_purchase).toLocaleString("vi-VN")}₫</strong>
                        </Text>
                      )}
                      {selectedCoupon.max_discount && (
                        <Text>
                          Giảm tối đa: <strong>{Math.round(selectedCoupon.max_discount).toLocaleString("vi-VN")}₫</strong>
                        </Text>
                      )}
                    </Space>
                  </div>
                </>
              )}

              <Divider style={{ margin: 0 }} />
              <div>
                <Text type="secondary">Lượt sử dụng</Text>
                <div style={{ marginTop: 8 }}>
                  <Text>
                    Đã dùng: <strong>{selectedCoupon.used_count || 0}</strong>
                    {selectedCoupon.usage_limit && ` / ${selectedCoupon.usage_limit}`}
                  </Text>
                </div>
              </div>

              <Divider style={{ margin: 0 }} />
              <div>
                <Text type="secondary">
                  <CalendarOutlined /> Thời gian áp dụng
                </Text>
                <div style={{ marginTop: 8 }}>
                  {selectedCoupon.start_date && selectedCoupon.end_date ? (
                    <Space direction="vertical" size={4}>
                      <Text>
                        <strong>Bắt đầu:</strong>{" "}
                        {dayjs(selectedCoupon.start_date).format("HH:mm - DD/MM/YYYY")}
                      </Text>
                      <Text>
                        <strong>Kết thúc:</strong>{" "}
                        {dayjs(selectedCoupon.end_date).format("HH:mm - DD/MM/YYYY")}
                      </Text>
                    </Space>
                  ) : (
                    <Text>Không giới hạn thời gian</Text>
                  )}
                </div>
              </div>

              <Divider style={{ margin: 0 }} />
              <div>
                <Text type="secondary">Trạng thái</Text>
                <div style={{ marginTop: 8 }}>
                  {selectedCoupon.is_active ? (
                    <Badge status="success" text="Đang hoạt động" />
                  ) : (
                    <Badge status="error" text="Ngừng hoạt động" />
                  )}
                </div>
              </div>

              <Divider style={{ margin: 0 }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Ngày tạo: {dayjs(selectedCoupon.created_at).format("HH:mm - DD/MM/YYYY")}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cập nhật: {dayjs(selectedCoupon.updated_at).format("HH:mm - DD/MM/YYYY")}
                </Text>
              </div>
            </Space>

            <Divider />

            <Space style={{ width: "100%", justifyContent: "center" }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setDrawerVisible(false);
                  handleOpenModal(selectedCoupon);
                }}
              >
                Chỉnh sửa
              </Button>
              <Popconfirm
                title="Xác nhận xóa"
                description={`Bạn có chắc muốn xóa coupon "${selectedCoupon.code}"?`}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => {
                  handleDeleteCoupon(selectedCoupon.id);
                  setDrawerVisible(false);
                }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Xóa 2
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